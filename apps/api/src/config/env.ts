
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const jwtSecret = process.env.JWT_SECRET;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid PORT configuration");
}

if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
}

export const env = {
    port,
    nodeEnv: process.env.NODE_ENV ?? "development",
    jwtSecret,
    accessTokenExpiresIn: "15m" as const,
    refreshTokenExpiresInDays: Number(
        process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? 7,
    ),
    clientUrl1: process.env.CLIENT_URL1,
    clientUrl2: process.env.CLIENT_URL2
} as const;
