
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

import { validate } from "../../../src/middlewares/validate.middleware.js";
import { AppError } from "../../../src/utils/app-error.js";

describe("Validate Middleware", () => {
    let req: Partial<Request>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            body: {},
        };

        next = vi.fn();
    });

    it("should call next when body is valid", () => {
        const schema = z.object({
            name: z.string(),
            age: z.number(),
        });

        req.body = {
            name: "Test User",
            age: 25,
        };

        const middleware = validate(schema);

        middleware(
            req as Request,
            {} as Response,
            next,
        );

        expect(req.body).toEqual({
            name: "Test User",
            age: 25,
        });

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
    });

    it("should replace request body with parsed data", () => {
        const schema = z.object({
            name: z.string().trim(),
        });

        req.body = {
            name: "  Test User  ",
        };

        const middleware = validate(schema);

        middleware(
            req as Request,
            {} as Response,
            next,
        );

        expect(req.body).toEqual({
            name: "Test User",
        });

        expect(next).toHaveBeenCalledOnce();
    });

    it("should call next with 400 AppError when body is invalid", () => {
        const schema = z.object({
            name: z.string(),
        });

        req.body = {
            name: 123,
        };

        const middleware = validate(schema);

        middleware(
            req as Request,
            {} as Response,
            next,
        );

        expect(next).toHaveBeenCalledOnce();

        const error = vi.mocked(next).mock.calls[0][0];

        expect(error).toBeInstanceOf(AppError);
        expect(error).toMatchObject({
            statusCode: 400,
        });
    });

    it("should combine multiple validation error messages", () => {
        const schema = z.object({
            name: z.string().min(3, "Name is too short"),
            email: z.string().email("Invalid email"),
        });

        req.body = {
            name: "A",
            email: "invalid",
        };

        const middleware = validate(schema);

        middleware(
            req as Request,
            {} as Response,
            next,
        );

        const error = vi.mocked(next).mock.calls[0][0];

        expect(error).toBeInstanceOf(AppError);

        expect(error).toMatchObject({
            statusCode: 400,
            message: "Name is too short, Invalid email",
        });
    });

    it("should not call next without an error when body is invalid", () => {
        const schema = z.object({
            email: z.string().email(),
        });

        req.body = {
            email: "invalid",
        };

        const middleware = validate(schema);

        middleware(
            req as Request,
            {} as Response,
            next,
        );

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith(
            expect.any(AppError),
        );
    });
});
