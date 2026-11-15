
import type { CookieOptions } from "express";

import { env } from "./env.js";

const refreshCookieBaseOptions: CookieOptions = {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
};

export const refreshCookieOptions: CookieOptions = {
    ...refreshCookieBaseOptions,
    maxAge:
        env.refreshTokenExpiresInDays *
        24 *
        60 *
        60 *
        1000,
};

export const refreshCookieClearOptions: CookieOptions = {
    ...refreshCookieBaseOptions,
};
