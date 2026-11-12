
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type {
    Request,
    Response,
    NextFunction,
} from "express";

import { ZodError, z } from "zod";
import { AppError } from "../../../src/utils/app-error.js";
import { errorHandler } from "../../../src/middlewares/error.middleware.js";

describe("Error Middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    let status: ReturnType<typeof vi.fn>;
    let json: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.restoreAllMocks();

        status = vi.fn().mockReturnThis();
        json = vi.fn();

        req = {};

        res = {
            status,
            json,
        };

        next = vi.fn();
    });

    const executeMiddleware = (error: unknown) => {
        errorHandler(
            error,
            req as Request,
            res as Response,
            next,
        );
    };

    it("should return 400 for ZodError", () => {
        const schema = z.object({
            email: z.string().email(),
        });

        const result = schema.safeParse({
            email: "invalid-email",
        });

        expect(result.success).toBe(false);

        if (result.success) {
            throw new Error("Expected validation to fail");
        }

        const error = new ZodError(result.error.issues);

        executeMiddleware(error);

        expect(status).toHaveBeenCalledWith(400);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Validation failed",
            errors: error.issues,
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return the correct status and message for AppError", () => {
        const error = new AppError(
            "Project not found",
            404,
        );

        executeMiddleware(error);

        expect(status).toHaveBeenCalledWith(404);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Project not found",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 500 for unexpected errors", () => {
        const consoleSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => { });

        const error = new Error("Database connection failed");

        executeMiddleware(error);

        expect(consoleSpy).toHaveBeenCalledWith(
            "Unexpected error:",
            error,
        );

        expect(status).toHaveBeenCalledWith(500);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Internal server error",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 500 for non-Error values", () => {
        vi.spyOn(console, "error").mockImplementation(() => { });

        executeMiddleware("Unexpected failure");

        expect(status).toHaveBeenCalledWith(500);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Internal server error",
        });
    });
});