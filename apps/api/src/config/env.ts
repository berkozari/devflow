
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const jwtSecret = process.env.JWT_SECRET;
const csrfSecret = process.env.CSRF_SECRET;

const refreshTokenExpiresInDays = Number(
    process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? 7,
);

const nodeEnv = process.env.NODE_ENV ?? "development";

const logLevel = process.env.LOG_LEVEL ??
    (nodeEnv === "production" ? "info" : "debug");

const clientUrl1 = process.env.CLIENT_URL1;
const clientUrl2 = process.env.CLIENT_URL2;

const redisUrl = process.env.REDIS_URL;

const rateLimitWindowMs = Number(
    process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000,
);

const generalRateLimitMax = Number(
    process.env.RATE_LIMIT_MAX_REQUESTS ?? 100,
);

const authRateLimitMax = Number(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS ?? 10,
);

const refreshRateLimitMax = Number(
    process.env.REFRESH_RATE_LIMIT_MAX_REQUESTS ?? 20,
);

const allowedLogLevels = [
    "fatal",
    "error",
    "warn",
    "info",
    "debug",
    "trace",
    "silent",
] as const;

if (
    !allowedLogLevels.includes(
        logLevel as (typeof allowedLogLevels)[number],
    )
) {
    throw new Error("Invalid LOG_LEVEL configuration");
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid PORT configuration");
}

if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
}

if (!csrfSecret || csrfSecret.length < 32) {
    throw new Error("CSRF_SECRET must contain at least 32 characters");
}

if (
    !Number.isInteger(refreshTokenExpiresInDays) ||
    refreshTokenExpiresInDays < 1
) {
    throw new Error(
        "REFRESH_TOKEN_EXPIRES_IN_DAYS must be a positive integer",
    );
}

if (!["development", "production", "test"].includes(nodeEnv)) {
    throw new Error("Invalid NODE_ENV configuration");
}


function validateClientUrl(
    value: string | undefined,
    name: string,
): void {
    if (!value) {
        return;
    }

    let url: URL;

    try {
        url = new URL(value);
    } catch {
        throw new Error(`${name} must be a valid URL`);
    }

    if (
        nodeEnv === "production" &&
        url.protocol !== "https:"
    ) {
        throw new Error(`${name} must use HTTPS in production`);
    }
}

validateClientUrl(clientUrl1, "CLIENT_URL1");
validateClientUrl(clientUrl2, "CLIENT_URL2");

if (nodeEnv === "production" && (!clientUrl1 || !clientUrl2)) {
    throw new Error(
        "CLIENT_URL1 and CLIENT_URL2 are required in production",
    );
}

if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
}

const rateLimitValues = [
    rateLimitWindowMs,
    generalRateLimitMax,
    authRateLimitMax,
    refreshRateLimitMax,
];

if (
    rateLimitValues.some(
        (value) => !Number.isSafeInteger(value) || value <= 0,
    )
) {
    throw new Error("Invalid rate limit configuration");
}

export const env = {
    port,
    nodeEnv,
    logLevel,
    jwtSecret,
    csrfSecret,
    accessTokenExpiresIn: "15m" as const,
    refreshTokenExpiresInDays,
    clientUrl1,
    clientUrl2,
    redisUrl,
    rateLimitWindowMs,
    generalRateLimitMax,
    authRateLimitMax,
    refreshRateLimitMax,
} as const;
