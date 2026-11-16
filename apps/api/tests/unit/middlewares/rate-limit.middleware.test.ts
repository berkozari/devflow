import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rateLimitMock, storeConstructorMock, redisCallMock } = vi.hoisted(() => ({
    rateLimitMock: vi.fn(),
    storeConstructorMock: vi.fn(),
    redisCallMock: vi.fn(),
}));

vi.mock("express-rate-limit", () => ({
    default: rateLimitMock,
}));

vi.mock("rate-limit-redis", () => ({
    RedisStore: class {
        readonly options: unknown;
        constructor(options: unknown) {
            this.options = options;
            storeConstructorMock(options);
        }
    },
}));

vi.mock("../../../src/config/redis.js", () => ({
    redis: { call: redisCallMock },
}));

vi.mock("../../../src/config/env.js", () => ({
    env: {
        rateLimitWindowMs: 900_000,
        generalRateLimitMax: 100,
        authRateLimitMax: 10,
        refreshRateLimitMax: 20,
    },
}));

type StoreOptions = {
    prefix: string;
    sendCommand: (...args: string[]) => unknown;
};

type RateLimitOptions = {
    windowMs: number;
    limit: number;
    standardHeaders: string;
    legacyHeaders: boolean;
    passOnStoreError: boolean;
    skip: () => boolean;
    message: { success: boolean; message: string };
    store: { options: StoreOptions };
};

describe("Rate Limit Middleware Configuration", () => {
    let options: RateLimitOptions[];

    beforeEach(async () => {
        vi.resetModules();
        vi.resetAllMocks();
        rateLimitMock.mockImplementation((config: RateLimitOptions) => config);
        await import("../../../src/middlewares/rate-limit.middleware.js");
        options = rateLimitMock.mock.calls.map(([config]) => config as RateLimitOptions);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("builds three independent Redis-backed limiters with distinct limits", () => {
        expect(rateLimitMock).toHaveBeenCalledTimes(3);
        expect(storeConstructorMock).toHaveBeenCalledTimes(3);
        expect(options.map(({ limit }) => limit)).toEqual([100, 10, 20]);
        expect(options.map(({ store }) => store.options.prefix)).toEqual([
            "rl:general:",
            "rl:auth:",
            "rl:refresh:",
        ]);
        expect(options.every(({ windowMs }) => windowMs === 900_000)).toBe(true);
    });

    it("uses standard rate-limit headers and fails closed on store errors", () => {
        for (const limiter of options) {
            expect(limiter.standardHeaders).toBe("draft-8");
            expect(limiter.legacyHeaders).toBe(false);
            expect(limiter.passOnStoreError).toBe(false);
            expect(limiter.message.success).toBe(false);
        }
        expect(options.map(({ message }) => message.message)).toEqual([
            "Too many requests. Please try again later.",
            "Too many authentication attempts. Please try again later.",
            "Too many refresh attempts. Please try again later.",
        ]);
    });

    it("skips rate limiting only when NODE_ENV is test", () => {
        vi.stubEnv("NODE_ENV", "test");
        expect(options.every(({ skip }) => skip())).toBe(true);

        vi.stubEnv("NODE_ENV", "development");
        expect(options.every(({ skip }) => !skip())).toBe(true);

        vi.stubEnv("NODE_ENV", "production");
        expect(options.every(({ skip }) => !skip())).toBe(true);
    });

    it("forwards Redis commands and all arguments to the dedicated client", async () => {
        const response = Promise.resolve(42);
        redisCallMock.mockReturnValue(response);

        const result = options[1]!.store.options.sendCommand(
            "EVALSHA", "script-hash", "1", "rl:auth:key", "123",
        );

        expect(redisCallMock).toHaveBeenCalledTimes(1);
        expect(redisCallMock).toHaveBeenCalledWith(
            "EVALSHA", "script-hash", "1", "rl:auth:key", "123",
        );
        await expect(result).resolves.toBe(42);
    });
});
