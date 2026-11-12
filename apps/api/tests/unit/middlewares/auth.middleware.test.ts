
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

import { tokenService } from "../../../src/services/token.service.js";
import { authenticate } from "../../../src/middlewares/auth.middleware.js";

vi.mock("../../../src/services/token.service.js", () => ({
    tokenService: {
        verifyAccessToken: vi.fn(),
    },
}));

const mockedTokenService = vi.mocked(tokenService);

describe("Auth Middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    let status: ReturnType<typeof vi.fn>;
    let json: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.resetAllMocks();

        status = vi.fn().mockReturnThis();
        json = vi.fn();

        req = {
            headers: {},
        };

        res = {
            status,
            json,
        };

        next = vi.fn();
    });

    const executeMiddleware = () => {
        authenticate(
            req as Request,
            res as Response,
            next,
        );
    };

    it("should return 401 when authorization header is missing", () => {
        executeMiddleware();

        expect(status).toHaveBeenCalledWith(401);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Authentication required",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when authorization format is invalid", () => {
        req.headers = {
            authorization: "Basic some-token",
        };

        executeMiddleware();

        expect(status).toHaveBeenCalledWith(401);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Authentication required",
        });

        expect(mockedTokenService.verifyAccessToken).not.toHaveBeenCalled();
    });

    it("should return 401 when authorization header is empty", () => {
        req.headers = {
            authorization: "",
        };

        executeMiddleware();

        expect(status).toHaveBeenCalledWith(401);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Authentication required",
        });
    });

    it("should authenticate successfully with a valid token", () => {
        req.headers = {
            authorization: "Bearer valid-token",
        };

        mockedTokenService.verifyAccessToken.mockReturnValue({
            sub: "user-uuid",
            email: "test@example.com",
            role: "USER",
        } as never);

        executeMiddleware();

        expect(
            mockedTokenService.verifyAccessToken,
        ).toHaveBeenCalledWith("valid-token");

        expect(req.user).toEqual({
            id: "user-uuid",
            email: "test@example.com",
            role: "USER",
        });

        expect(next).toHaveBeenCalledOnce();
        expect(status).not.toHaveBeenCalled();
    });

    it.each(["USER", "ADMIN", "MANAGER"] as const)(
        "should accept %s role",
        (role) => {
            req.headers = {
                authorization: "Bearer valid-token",
            };

            mockedTokenService.verifyAccessToken.mockReturnValue({
                sub: "user-uuid",
                email: "test@example.com",
                role,
            } as never);

            executeMiddleware();

            expect(req.user?.role).toBe(role);
            expect(next).toHaveBeenCalledOnce();
        },
    );

    it("should return 401 when token payload is a string", () => {
        req.headers = {
            authorization: "Bearer invalid-payload",
        };

        mockedTokenService.verifyAccessToken.mockReturnValue(
            "invalid-payload" as never,
        );

        executeMiddleware();

        expect(status).toHaveBeenCalledWith(401);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid access token",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when token subject is missing", () => {
        req.headers = {
            authorization: "Bearer invalid-token",
        };

        mockedTokenService.verifyAccessToken.mockReturnValue({
            email: "test@example.com",
            role: "USER",
        } as never);

        executeMiddleware();

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid access token",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when email is not a string", () => {
        req.headers = {
            authorization: "Bearer invalid-token",
        };

        mockedTokenService.verifyAccessToken.mockReturnValue({
            sub: "user-uuid",
            email: 123,
            role: "USER",
        } as never);

        executeMiddleware();

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid access token",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when role is not a string", () => {
        req.headers = {
            authorization: "Bearer invalid-token",
        };

        mockedTokenService.verifyAccessToken.mockReturnValue({
            sub: "user-uuid",
            email: "test@example.com",
            role: 123,
        } as never);

        executeMiddleware();

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid access token",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when role is not supported", () => {
        req.headers = {
            authorization: "Bearer invalid-role",
        };

        mockedTokenService.verifyAccessToken.mockReturnValue({
            sub: "user-uuid",
            email: "test@example.com",
            role: "SUPERADMIN",
        } as never);

        executeMiddleware();

        expect(status).toHaveBeenCalledWith(401);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid user role",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when token verification throws an error", () => {
        req.headers = {
            authorization: "Bearer expired-token",
        };

        mockedTokenService.verifyAccessToken.mockImplementation(() => {
            throw new Error("Token expired");
        });

        executeMiddleware();

        expect(status).toHaveBeenCalledWith(401);

        expect(json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid or expired access token",
        });

        expect(next).not.toHaveBeenCalled();
    });
});