import type { RequestHandler } from "express";

import { authService } from "../services/auth.service.js";
import { successResponse } from "../utils/api-response.js";
import {
    refreshCookieOptions,
    refreshCookieClearOptions,
} from "../config/cookie.js";
import { generateCsrfToken } from "../config/csrf.js";
import { AppError } from "../utils/app-error.js";

export const getCsrfToken: RequestHandler = (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    const csrfToken = generateCsrfToken(req, res);

    res.status(200).json(
        successResponse("CSRF token generated", {
            csrfToken,
        }),
    );
};

export const register: RequestHandler = async (req, res) => {
    const user = await authService.register(req.body);

    res.setHeader("Cache-Control", "no-store");
    res.status(201).json(
        successResponse("User registered successfully", user),
    );
};

export const login: RequestHandler = async (req, res) => {
    const result = await authService.login(req.body);

    res.cookie(
        "refreshToken",
        result.refreshToken,
        refreshCookieOptions,
    );

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(
        successResponse("Login successful", {
            accessToken: result.accessToken,
            user: result.user,
        }),
    );
};

export const refresh: RequestHandler = async (req, res) => {
    const rawToken: unknown = req.cookies?.refreshToken;

    if (typeof rawToken !== "string" || rawToken.length === 0) {
        throw new AppError("Refresh token is required", 401);
    }

    const result = await authService.refresh(rawToken);

    res.cookie(
        "refreshToken",
        result.refreshToken,
        refreshCookieOptions,
    );

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(
        successResponse("Token refreshed successfully", {
            accessToken: result.accessToken,
            user: result.user,
        }),
    );
};

export const logout: RequestHandler = async (req, res) => {
    const cookieValue: unknown = req.cookies?.refreshToken;
    const rawToken =
        typeof cookieValue === "string" && cookieValue.length > 0
            ? cookieValue
            : undefined;

    await authService.logout(rawToken);

    res.clearCookie("refreshToken", refreshCookieClearOptions);

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(
        successResponse("Logout successful"),
    );
};
