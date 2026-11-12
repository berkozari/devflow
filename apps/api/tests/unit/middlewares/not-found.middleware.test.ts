
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type { Request, Response } from "express";

import { notFoundHandler } from "../../../src/middlewares/not-found.middleware.js";

describe("Not Found Middleware", () => {
    let req: Request;
    let res: Response;

    beforeEach(() => {
        req = {
            method: "GET",
            originalUrl: "/api/unknown",
        } as Request;

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;
    });

    it("should return 404 with the requested route", () => {
        notFoundHandler(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(404);

        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Route GET /api/unknown not found",
        });
    });

    it("should return the correct message for POST requests", () => {
        req.method = "POST";
        req.originalUrl = "/api/projects";

        notFoundHandler(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(404);

        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Route POST /api/projects not found",
        });
    });
});
