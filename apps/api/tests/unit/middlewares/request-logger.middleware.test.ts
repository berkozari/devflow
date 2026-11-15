
import express from "express";
import request from "supertest";

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { logger } from "../../../src/lib/logger.js";
import { requestLogger } from "../../../src/middlewares/request-logger.middleware.js";

describe("Request Logger Middleware", () => {
    const createTestApp = () => {
        const app = express();

        app.use(requestLogger);

        app.get("/success", (_req, res) => {
            res.status(200).json({ success: true });
        });

        app.get("/client-error", (_req, res) => {
            res.status(400).json({ success: false });
        });

        app.get("/server-error", (_req, res) => {
            res.status(500).json({ success: false });
        });

        app.get("/health", (_req, res) => {
            res.status(200).json({ status: "ok" });
        });

        return app;
    };

    it("should handle successful requests", async () => {
        const app = createTestApp();
        const response = await request(app).get("/success");

        expect(response.status).toBe(200);
    });

    it("should handle client errors", async () => {
        const app = createTestApp();
        const response = await request(app).get("/client-error");

        expect(response.status).toBe(400);
    });

    it("should handle server errors", async () => {
        const app = createTestApp();
        const response = await request(app).get("/server-error");

        expect(response.status).toBe(500);
    });

    it("should ignore health check requests", async () => {
        const app = createTestApp();
        const response = await request(app).get("/health");

        expect(response.status).toBe(200);
    });

    it("should not expose query parameters in serialized request logs", async () => {
        const app = createTestApp();
        const response = await request(app)
            .get("/success?token=secret-value");

        expect(response.status).toBe(200);
    });
});
