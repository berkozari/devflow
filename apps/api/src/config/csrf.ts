
import { randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { doubleCsrf } from "csrf-csrf";

import { env } from "./env.js";

const isProduction = env.nodeEnv === "production";

const csrfSessionCookieName = isProduction
    ? "__Host-csrf-session"
    : "csrf-session";

const csrfCookieName = isProduction
    ? "__Host-csrf-token"
    : "csrf-token";

const csrfCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const csrfSessionMiddleware: RequestHandler = (
    req,
    res,
    next,
) => {
    if (!req.cookies?.[csrfSessionCookieName]) {
        const sessionId = randomBytes(32).toString("hex");

        res.cookie(
            csrfSessionCookieName,
            sessionId,
            csrfCookieOptions,
        );

        req.cookies = {
            ...req.cookies,
            [csrfSessionCookieName]: sessionId,
        };
    }

    next();
};

const csrf = doubleCsrf({
    getSecret: () => env.csrfSecret,

    getSessionIdentifier: (req) =>
        req.cookies?.[csrfSessionCookieName] ?? "",

    cookieName: csrfCookieName,

    cookieOptions: csrfCookieOptions,

    ignoredMethods: ["GET", "HEAD", "OPTIONS"],

    getCsrfTokenFromRequest: (req) =>
        req.headers["x-csrf-token"],
});

export const {
    doubleCsrfProtection,
    generateCsrfToken,
    invalidCsrfTokenError,
} = csrf;

export const csrfCookieNames = {
    session: csrfSessionCookieName,
    token: csrfCookieName,
};
