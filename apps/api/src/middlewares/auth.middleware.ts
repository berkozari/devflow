
import type { RequestHandler } from "express";
import { tokenService } from "../services/token.service.js";

export const authenticate: RequestHandler = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            message: "Authentication required",
        });
        return;
    }

    const token = authorization.slice(7);

    try {
        const payload = tokenService.verifyAccessToken(token);

        if (
            typeof payload === "string" ||
            !payload.sub ||
            typeof payload.email !== "string" ||
            typeof payload.role !== "string"
        ) {
            res.status(401).json({
                success: false,
                message: "Invalid access token",
            });
            return;
        }

        if (!["USER", "ADMIN", "MANAGER"].includes(payload.role)) {
            res.status(401).json({
                success: false,
                message: "Invalid user role",
            });
            return;
        }

        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role as "USER" | "ADMIN" | "MANAGER",
        };

        next();
    } catch {
        res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
};
