
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

import type { Role } from "../../../src/generated/prisma/client.js";

import { authorize } from "../../../src/middlewares/authorize.middleware.js";

describe("Authorize Middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    const status = vi.fn();
    const json = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        req = {
            user: {
                id: "user-uuid",
                email: "test@example.com",
                role: "ADMIN",
            },
        } as Request;

        status.mockReturnValue({
            json,
        });

        res = {
            status,
            json,
        };

        next = vi.fn();
    });

    it("should call next when user has an allowed role", () => {
        const middleware = authorize("ADMIN" as Role);

        middleware(
            req as Request,
            res as Response,
            next,
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
    });

    it("should return 401 when user is not authenticated", () => {
        req.user = undefined;

        const middleware = authorize("ADMIN" as Role);

        middleware(
            req as Request,
            res as Response,
            next,
        );

        expect(status).toHaveBeenCalledWith(401);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Authentication required",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 when user does not have an allowed role", () => {
        req.user = {
            id: "user-uuid",
            email: "test@example.com",
            role: "MEMBER",
        } as Request["user"];

        const middleware = authorize("ADMIN" as Role);

        middleware(
            req as Request,
            res as Response,
            next,
        );

        expect(status).toHaveBeenCalledWith(403);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "You do not have permission to access this resource",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should allow user when role matches one of multiple allowed roles", () => {
        const middleware = authorize(
            "ADMIN" as Role,
            "USER" as Role,
        );

        middleware(
            req as Request,
            res as Response,
            next,
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
    });

    it("should return 403 when no roles are allowed", () => {
        const middleware = authorize();

        middleware(
            req as Request,
            res as Response,
            next,
        );

        expect(status).toHaveBeenCalledWith(403);

        expect(next).not.toHaveBeenCalled();
    });
});
