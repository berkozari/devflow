
import { redis } from "../config/redis.js";

export const cache = {
    async get<T>(key: string): Promise<T | null> {
        const value = await redis.get(key);

        if (!value) {
            return null;
        }

        try {
            return JSON.parse(value) as T;
        } catch {
            await redis.del(key);
            return null;
        }
    },

    async set<T>(
        key: string,
        value: T,
        ttlSeconds = 300,
    ): Promise<void> {
        await redis.set(
            key,
            JSON.stringify(value),
            "EX",
            ttlSeconds,
        );
    },

    async delete(key: string): Promise<void> {
        await redis.del(key);
    },

    async deleteByPattern(pattern: string): Promise<void> {
        let cursor = "0";

        do {
            const [nextCursor, keys] = await redis.scan(
                cursor,
                "MATCH",
                pattern,
                "COUNT",
                100,
            );

            cursor = nextCursor;

            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== "0");
    },

    async exists(key: string): Promise<boolean> {
        return (await redis.exists(key)) === 1;
    },
};
