
import type { RequestHandler } from "express";
import { tokenService } from "../services/token.service.js";

type AuthenticatedUser = NonNullable<
    Express.Request["user"]
>;

const ALLOWED_ROLES = ["USER", "ADMIN", "MANAGER"] as const;

const isValidRole = (
    role: unknown
): role is AuthenticatedUser["role"] => {
    return (
        typeof role === "string" &&
        ALLOWED_ROLES.some((allowedRole) => allowedRole === role)
    );
};

export const authenticate: RequestHandler = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            message: "Authentication required",
        });
        return;
    }

    const token = authorization.slice(7).trim();

    if (!token) {
        res.status(401).json({
            success: false,
            message: "Invalid access token",
        });
        return;
    }

    let user: AuthenticatedUser;

    try {
        const payload = tokenService.verifyAccessToken(token);

        if (
            typeof payload === "string" ||
            typeof payload.sub !== "string" ||
            !payload.sub ||
            typeof payload.email !== "string" ||
            !payload.email ||
            !isValidRole(payload.role)
        ) {
            res.status(401).json({
                success: false,
                message: "Invalid access token",
            });
            return;
        }

        user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    } catch {
        res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
        return;
    }

    req.user = user;

    next();
};
