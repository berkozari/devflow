
import type { RequestHandler } from "express";

import { authService } from "../services/auth.service.js";
import { successResponse } from "../utils/api-response.js";
import { refreshCookieOptions } from "../config/cookie.js";
import { AppError } from "../utils/app-error.js";

export const register: RequestHandler = async (req, res) => {
    const user = await authService.register(req.body);

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

    res.status(200).json(
        successResponse("Login successful", {
            accessToken: result.accessToken,
            user: result.user,
        }),
    );
};


export const refresh: RequestHandler = async (req, res) => {
    const rawToken = req.cookies?.refreshToken as string | undefined;

    if (!rawToken) {
        throw new AppError("Refresh token is required", 401);
    }

    const result = await authService.refresh(rawToken);

    res.cookie(
        "refreshToken",
        result.refreshToken,
        refreshCookieOptions,
    );

    res.status(200).json(
        successResponse("Token refreshed successfully", {
            accessToken: result.accessToken,
            user: result.user,
        }),
    );
};

export const logout: RequestHandler = async (req, res) => {
    const rawToken = req.cookies?.refreshToken as string | undefined;

    await authService.logout(rawToken);

    res.clearCookie("refreshToken", refreshCookieOptions);

    res.status(200).json(
        successResponse("Logout successful"),
    );
};

