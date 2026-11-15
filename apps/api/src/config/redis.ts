import { Redis } from "ioredis";

import { env } from "./env.js";
import { logger } from "../lib/logger.js";

export const redis = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,

    retryStrategy(times: number): number | null {
        if (times > 10) {
            return null;
        }

        return Math.min(times * 200, 2000);
    },
});

redis.on("connect", () => {
    logger.info("Redis connected");
});

redis.on("ready", () => {
    logger.info("Redis ready");
});

redis.on("error", (error: Error) => {
    logger.error({ err: error }, "Redis connection error");
});

redis.on("close", () => {
    logger.warn("Redis connection closed");
});

redis.on("end", () => {
    // This also fires during an intentional shutdown.
    logger.warn("Redis connection ended");
});