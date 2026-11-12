
import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type { Request, Response } from "express";

import { getMe } from "../../../src/controllers/user.controller.js";

describe("User Controller", () => {
    describe("getMe", () => {
        it("should return authenticated user successfully", () => {
            const user = {
                id: "user-uuid",
                email: "test@example.com",
                role: "USER" as const,
            };

            const req = {
                user,
            } as unknown as Request;

            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn().mockReturnThis(),
            } as unknown as Response;

            getMe(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: user,
            });
        });

        it("should return undefined when user is not attached to request", () => {
            const req = {
                user: undefined,
            } as unknown as Request;

            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn().mockReturnThis(),
            } as unknown as Response;

            getMe(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: undefined,
            });
        });
    });
});
