
import type { Role } from "../generated/prisma/client.js";
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

interface AccessTokenPayload {
    sub: string;
    email: string;
}

export const tokenService = {
    generateAccessToken(user: {
        id: string;
        email: string;
        role: Role;
    }) {
        return jwt.sign(
            {
                email: user.email,
                role: user.role,
            },
            env.jwtSecret,
            {
                subject: user.id,
                expiresIn: env.accessTokenExpiresIn,
                issuer: "devflow-api",
                audience: "devflow-web",
            },
        );
    },

    generateRefreshToken() {
        return randomBytes(48).toString("hex");
    },

    hashRefreshToken(token: string) {
        return createHash("sha256")
            .update(token)
            .digest("hex");
    },

    getRefreshTokenExpiry() {
        const expiresAt = new Date();

        expiresAt.setDate(
            expiresAt.getDate() + env.refreshTokenExpiresInDays,
        );

        return expiresAt;
    },

    verifyAccessToken(token: string) {
        return jwt.verify(token, env.jwtSecret, {
            issuer: "devflow-api",
            audience: "devflow-web",
        });
    },
};
