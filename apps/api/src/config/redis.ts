
import { Redis } from "ioredis";

import { env } from "./env.js";
import { logger } from "../lib/logger.js";

// Reject accidental use of the development Redis instance during tests.
// We deliberately require a separate local Redis server on port 6380.
if (process.env.NODE_ENV === "test") {
    const expectedTestRedisUrl = process.env.TEST_REDIS_URL;

    if (!expectedTestRedisUrl || env.redisUrl !== expectedTestRedisUrl) {
        throw new Error(
            "Test REDIS_URL must match TEST_REDIS_URL",
        );
    }

    let url: URL;
    try {
        url = new URL(env.redisUrl);
    } catch {
        throw new Error("Test REDIS_URL is not a valid URL");
    }

    if (
        !["redis:", "rediss:"].includes(url.protocol) ||
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        url.port !== "6380"
    ) {
        throw new Error(
            "Tests require a dedicated local Redis instance on port 6380",
        );
    }
}

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
