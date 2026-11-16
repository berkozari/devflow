import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

import { redis } from "../../src/config/redis.js";
import { env } from "../../src/config/env.js";
import { cache } from "../../src/lib/cache.js";
import {
    authRateLimiter,
    refreshRateLimiter,
} from "../../src/middlewares/rate-limit.middleware.js";

// The normal API integration tests deliberately bypass rate limiting.
// This suite explicitly enables it against the dedicated TEST Redis on 6380.
// Never run this suite against a development or production Redis database.
describe("Rate limiting with dedicated test Redis", () => {
    function createApp() {
        const app = express();
        app.get("/auth", authRateLimiter, (_req, res) => {
            res.status(200).json({ success: true });
        });
        app.get("/refresh", refreshRateLimiter, (_req, res) => {
            res.status(200).json({ success: true });
        });
        return app;
    }

    beforeAll(async () => {
        expect(process.env.NODE_ENV).toBe("test");
        expect(env.redisUrl).toBe(process.env.TEST_REDIS_URL);
        const url = new URL(env.redisUrl);
        expect(["localhost", "127.0.0.1", "[::1]"]).toContain(url.hostname);
        expect(url.port).toBe("6380");
        await redis.ping();
    });

    beforeEach(async () => {
        // The dedicated test server is isolated; only clear rate-limit prefixes.
        await cache.deleteByPattern("rl:auth:*");
        await cache.deleteByPattern("rl:refresh:*");
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        await cache.deleteByPattern("rl:auth:*");
        await cache.deleteByPattern("rl:refresh:*");
    });

    afterAll(async () => {
        await redis.quit();
    });

    it("bypasses rate limiting for ordinary NODE_ENV=test requests", async () => {
        const app = createApp();
        for (let i = 0; i <= env.authRateLimitMax; i += 1) {
            const response = await request(app).get("/auth");
            expect(response.status).toBe(200);
        }
        const keys = await redis.keys("rl:auth:*");
        expect(keys).toHaveLength(0);
    });

    it("rejects an excess auth request while keeping the refresh counter independent", async () => {
        const app = createApp();
        // Only the skip callback reads NODE_ENV dynamically. Redis was already
        // initialized (and validated) under test mode in beforeAll.
        vi.stubEnv("NODE_ENV", "development");

        for (let i = 0; i < env.authRateLimitMax; i += 1) {
            const response = await request(app).get("/auth");
            expect(response.status).toBe(200);
        }

        const blocked = await request(app).get("/auth");
        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({
            success: false,
            message: "Too many authentication attempts. Please try again later.",
        });

        // An auth failure must not consume the independently-prefixed refresh limit.
        const refresh = await request(app).get("/refresh");
        expect(refresh.status).toBe(200);
    });

    it("fails closed when the Redis rate-limit store fails", async () => {
        const app = createApp();
        vi.stubEnv("NODE_ENV", "development");
        vi.spyOn(redis, "call").mockRejectedValue(new Error("Test Redis call failed"));

        const response = await request(app).get("/auth");
        expect(response.status).toBe(500);
        // Do not assert the default Express error body: it is not an API contract.
    });
});
