
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

import { redis } from "../config/redis.js";
import { env } from "../config/env.js";

function createRedisStore(prefix: string) {
    return new RedisStore({
        prefix,
        sendCommand: (...args: string[]) =>
            redis.call(
                args[0]!,
                ...args.slice(1),
            ) as ReturnType<
                import("rate-limit-redis").SendCommandFn
            >,
    });
}

function createRateLimiter(
    prefix: string,
    limit: number,
    message: string,
) {
    return rateLimit({
        windowMs: env.rateLimitWindowMs,
        limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        store: createRedisStore(prefix),
        passOnStoreError: false,
        message: {
            success: false,
            message,
        },

        skip: () => process.env.NODE_ENV === "test",
    });
}

export const generalRateLimiter = createRateLimiter(
    "rl:general:",
    env.generalRateLimitMax,
    "Too many requests. Please try again later.",
);

export const authRateLimiter = createRateLimiter(
    "rl:auth:",
    env.authRateLimitMax,
    "Too many authentication attempts. Please try again later.",
);

export const refreshRateLimiter = createRateLimiter(
    "rl:refresh:",
    env.refreshRateLimitMax,
    "Too many refresh attempts. Please try again later.",
);
