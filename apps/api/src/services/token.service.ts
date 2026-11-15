
import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import type { Role } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

const ACCESS_TOKEN_ISSUER = "devflow-api";
const ACCESS_TOKEN_AUDIENCE = "devflow-web";
const ACCESS_TOKEN_ALGORITHM = "HS256" as const;

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
                algorithm: ACCESS_TOKEN_ALGORITHM,
                subject: user.id,
                expiresIn: env.accessTokenExpiresIn,
                issuer: ACCESS_TOKEN_ISSUER,
                audience: ACCESS_TOKEN_AUDIENCE,
            },
        );
    },

    generateRefreshToken() {
        return randomBytes(48).toString("hex");
    },

    generateTokenFamilyId() {
        return randomUUID();
    },

    hashRefreshToken(token: string) {
        return createHash("sha256")
            .update(token)
            .digest("hex");
    },

    getRefreshTokenExpiry() {
        return new Date(
            Date.now() +
            env.refreshTokenExpiresInDays *
            24 * 60 * 60 * 1000,
        );
    },

    verifyAccessToken(token: string) {
        return jwt.verify(token, env.jwtSecret, {
            issuer: ACCESS_TOKEN_ISSUER,
            audience: ACCESS_TOKEN_AUDIENCE,
            algorithms: [ACCESS_TOKEN_ALGORITHM],
        });
    },
};
