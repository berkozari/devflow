import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const probes = vi.hoisted(() => ({
    queryRaw: vi.fn(),
    ping: vi.fn(),
}));

// No live PostgreSQL/Redis connection. Unit tests cannot touch local-production.
vi.mock("../../../src/config/database.js", () => ({
    prisma: { $queryRaw: probes.queryRaw },
}));
vi.mock("../../../src/config/redis.js", () => ({
    redis: { ping: probes.ping },
}));

import healthRouter from "../../../src/routes/health.routes.js";

const app = express();
app.use("/api/v1/health", healthRouter);

beforeEach(() => {
    vi.resetAllMocks();
    probes.queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    probes.ping.mockResolvedValue("PONG");
});

describe("health routes", () => {
    it("liveness responds without querying dependencies", async () => {
        const response = await request(app)
            .get("/api/v1/health/live")
            .expect(200);

        expect(response.body).toEqual({ status: "ok" });
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(probes.queryRaw).not.toHaveBeenCalled();
        expect(probes.ping).not.toHaveBeenCalled();
    });

    it("readiness responds 200 when database and Redis respond", async () => {
        const response = await request(app)
            .get("/api/v1/health/ready")
            .expect(200);

        expect(response.body).toEqual({ status: "ok" });
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(probes.queryRaw).toHaveBeenCalledOnce();
        expect(probes.ping).toHaveBeenCalledOnce();
    });

    it("readiness responds 503 when PostgreSQL is unavailable", async () => {
        probes.queryRaw.mockRejectedValue(new Error("db connection failed"));

        const response = await request(app)
            .get("/api/v1/health/ready")
            .expect(503);

        expect(response.body).toEqual({ status: "unavailable" });
        expect(JSON.stringify(response.body)).not.toContain("connection failed");
    });

    it("readiness responds 503 when Redis is unavailable", async () => {
        probes.ping.mockRejectedValue(new Error("redis connection failed"));

        const response = await request(app)
            .get("/api/v1/health/ready")
            .expect(503);

        expect(response.body).toEqual({ status: "unavailable" });
    });

    it("readiness rejects unexpected Redis PING result", async () => {
        probes.ping.mockResolvedValue("NOT_PONG");

        const response = await request(app)
            .get("/api/v1/health/ready")
            .expect(503);

        expect(response.body).toEqual({ status: "unavailable" });
    });
});
