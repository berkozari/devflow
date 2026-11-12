
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type { Request, Response } from "express";

const {
    register,
    login,
    refresh,
    logout,
} = vi.hoisted(() => ({
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
}));

vi.mock("../../../src/services/auth.service.js", () => ({
    authService: {
        register,
        login,
        refresh,
        logout,
    },
}));

import * as authController from "../../../src/controllers/auth.controller.js";
import { refreshCookieOptions } from "../../../src/config/cookie.js";

const USER = {
    id: "user-uuid",
    name: "Test User",
    email: "test@example.com",
};

const ACCESS_TOKEN = "mock-access-token";
const REFRESH_TOKEN = "mock-refresh-token";

const registerInput = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
};

const loginInput = {
    email: "test@example.com",
    password: "password123",
};

function createMocks() {
    const req = {
        body: {},
        cookies: {},
    } as unknown as Request;

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        cookie: vi.fn().mockReturnThis(),
        clearCookie: vi.fn().mockReturnThis(),
    } as unknown as Response;

    return { req, res };
}

describe("Auth Controller", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("register", () => {
        it("should register a user successfully", async () => {
            const { req, res } = createMocks();

            req.body = registerInput;

            register.mockResolvedValue(USER);

            await authController.register(req, res, vi.fn());

            expect(register).toHaveBeenCalledWith(registerInput);

            expect(res.status).toHaveBeenCalledWith(201);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "User registered successfully",
                data: USER,
            });
        });
    });

    describe("login", () => {
        it("should login successfully and set refresh cookie", async () => {
            const { req, res } = createMocks();

            req.body = loginInput;

            login.mockResolvedValue({
                accessToken: ACCESS_TOKEN,
                refreshToken: REFRESH_TOKEN,
                user: USER,
            });

            await authController.login(req, res, vi.fn());

            expect(login).toHaveBeenCalledWith(loginInput);

            expect(res.cookie).toHaveBeenCalledWith(
                "refreshToken",
                REFRESH_TOKEN,
                refreshCookieOptions,
            );

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Login successful",
                data: {
                    accessToken: ACCESS_TOKEN,
                    user: USER,
                },
            });
        });
    });

    describe("refresh", () => {
        it("should throw 401 when refresh token is missing", async () => {
            const { req, res } = createMocks();

            req.cookies = {};

            await expect(
                authController.refresh(req, res, vi.fn()),
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Refresh token is required",
            });

            expect(refresh).not.toHaveBeenCalled();

            expect(res.cookie).not.toHaveBeenCalled();
        });

        it("should refresh tokens successfully", async () => {
            const { req, res } = createMocks();

            req.cookies = {
                refreshToken: REFRESH_TOKEN,
            };

            refresh.mockResolvedValue({
                accessToken: ACCESS_TOKEN,
                refreshToken: "new-refresh-token",
                user: USER,
            });

            await authController.refresh(req, res, vi.fn());

            expect(refresh).toHaveBeenCalledWith(REFRESH_TOKEN);

            expect(res.cookie).toHaveBeenCalledWith(
                "refreshToken",
                "new-refresh-token",
                refreshCookieOptions,
            );

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Token refreshed successfully",
                data: {
                    accessToken: ACCESS_TOKEN,
                    user: USER,
                },
            });
        });
    });

    describe("logout", () => {
        it("should logout successfully and clear refresh cookie", async () => {
            const { req, res } = createMocks();

            req.cookies = {
                refreshToken: REFRESH_TOKEN,
            };

            logout.mockResolvedValue(undefined);

            await authController.logout(req, res, vi.fn());

            expect(logout).toHaveBeenCalledWith(REFRESH_TOKEN);

            expect(res.clearCookie).toHaveBeenCalledWith(
                "refreshToken",
                refreshCookieOptions,
            );

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Logout successful",
            });
        });

        it("should logout when refresh token is missing", async () => {
            const { req, res } = createMocks();

            req.cookies = {};

            logout.mockResolvedValue(undefined);

            await authController.logout(req, res, vi.fn());

            expect(logout).toHaveBeenCalledWith(undefined);

            expect(res.clearCookie).toHaveBeenCalledWith(
                "refreshToken",
                refreshCookieOptions,
            );
        });
    });
});
