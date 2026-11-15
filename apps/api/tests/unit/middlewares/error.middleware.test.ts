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
import { logger } from "../../../src/lib/logger.js";
import { invalidCsrfTokenError } from "../../../src/config/csrf.js";

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

        req = {
            id: "test-request-id",
            method: "GET",
            path: "/api/v1/projects",
        };

        res = {
            status,
            json,
            headersSent: false,
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

    it("should return 403 for invalid CSRF token", () => {
        const loggerSpy = vi.spyOn(logger, "warn");

        executeMiddleware(invalidCsrfTokenError);

        expect(status).toHaveBeenCalledWith(403);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid or missing CSRF token",
        });

        expect(loggerSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: "test-request-id",
                method: "GET",
                path: "/api/v1/projects",
            }),
            "CSRF validation failed",
        );
    });

    it("should return 400 for ZodError", () => {
        const loggerSpy = vi.spyOn(logger, "warn");

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

        expect(loggerSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: "test-request-id",
                issues: expect.arrayContaining([
                    expect.objectContaining({
                        path: ["email"],
                    }),
                ]),
            }),
            "Request validation failed",
        );

        expect(next).not.toHaveBeenCalled();
    });

    it("should return the correct status and message for AppError", () => {
        const loggerSpy = vi.spyOn(logger, "warn");

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

        expect(loggerSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 404,
            }),
            "Project not found",
        );

        expect(next).not.toHaveBeenCalled();
    });

    it("should log AppError with status 500 as error", () => {
        const loggerSpy = vi.spyOn(logger, "error");

        const error = new AppError(
            "Internal application error",
            500,
        );

        executeMiddleware(error);

        expect(status).toHaveBeenCalledWith(500);

        expect(loggerSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 500,
            }),
            "Internal application error",
        );
    });

    it("should return 500 for unexpected errors", () => {
        const loggerSpy = vi.spyOn(logger, "error");

        const error = new Error("Database connection failed");

        executeMiddleware(error);

        expect(loggerSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: "test-request-id",
                method: "GET",
                path: "/api/v1/projects",
                err: error,
            }),
            "Unhandled application error",
        );

        expect(status).toHaveBeenCalledWith(500);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Internal server error",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 500 for non-Error values", () => {
        const loggerSpy = vi.spyOn(logger, "error");

        executeMiddleware("Unexpected failure");

        expect(loggerSpy).toHaveBeenCalled();

        expect(status).toHaveBeenCalledWith(500);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Internal server error",
        });
    });

    it("should forward error when headers are already sent", () => {
        const error = new Error("Response already started");

        res.headersSent = true;

        const loggerSpy = vi.spyOn(logger, "error");

        executeMiddleware(error);

        expect(next).toHaveBeenCalledWith(error);

        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();

        expect(loggerSpy).not.toHaveBeenCalled();
    });
});