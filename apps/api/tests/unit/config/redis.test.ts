import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { RedisMock, onMock, infoMock, warnMock, errorMock, config } = vi.hoisted(() => ({
    RedisMock: vi.fn(),
    onMock: vi.fn(),
    infoMock: vi.fn(),
    warnMock: vi.fn(),
    errorMock: vi.fn(),
    config: { redisUrl: "redis://127.0.0.1:6380/0" },
}));

vi.mock("ioredis", () => ({ Redis: RedisMock }));
vi.mock("../../../src/config/env.js", () => ({
    env: {
        get redisUrl() {
            return config.redisUrl;
        },
    },
}));
vi.mock("../../../src/lib/logger.js", () => ({
    logger: { info: infoMock, warn: warnMock, error: errorMock },
}));

describe("Redis Configuration", () => {
    const TEST_URL = "redis://127.0.0.1:6380/0";
    const mockedClient = { on: onMock };

    const loadRedis = () => import("../../../src/config/redis.js");

    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
        vi.stubEnv("NODE_ENV", "test");
        vi.stubEnv("TEST_REDIS_URL", TEST_URL);
        config.redisUrl = TEST_URL;
        RedisMock.mockImplementation(function () {
            return mockedClient;
        });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("constructs a lazy Redis client only for the dedicated test instance", async () => {
        const { redis } = await loadRedis();
        expect(redis).toBe(mockedClient);
        expect(RedisMock).toHaveBeenCalledOnce();
        expect(RedisMock).toHaveBeenCalledWith(TEST_URL, expect.objectContaining({
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryStrategy: expect.any(Function),
        }));
    });

    it("requires TEST_REDIS_URL in test mode", async () => {
        vi.stubEnv("TEST_REDIS_URL", undefined);
        await expect(loadRedis()).rejects.toThrow("Test REDIS_URL must match TEST_REDIS_URL");
        expect(RedisMock).not.toHaveBeenCalled();
    });

    it("rejects a mismatch between the active and dedicated Redis URLs", async () => {
        config.redisUrl = "redis://127.0.0.1:6379/0";
        await expect(loadRedis()).rejects.toThrow("Test REDIS_URL must match TEST_REDIS_URL");
        expect(RedisMock).not.toHaveBeenCalled();
    });

    it("rejects malformed test URLs before constructing a client", async () => {
        config.redisUrl = "not-a-url";
        vi.stubEnv("TEST_REDIS_URL", "not-a-url");
        await expect(loadRedis()).rejects.toThrow("Test REDIS_URL is not a valid URL");
        expect(RedisMock).not.toHaveBeenCalled();
    });

    it.each([
        "redis://127.0.0.1:6379/0",
        "redis://example.com:6380/0",
        "http://127.0.0.1:6380/0",
    ])("rejects unsafe test endpoint %s", async (url) => {
        config.redisUrl = url;
        vi.stubEnv("TEST_REDIS_URL", url);
        await expect(loadRedis()).rejects.toThrow(
            "Tests require a dedicated local Redis instance on port 6380",
        );
        expect(RedisMock).not.toHaveBeenCalled();
    });

    it.each([
        "redis://localhost:6380/0",
        "redis://[::1]:6380/0",
        "rediss://127.0.0.1:6380/0",
    ])("permits supported loopback test URL %s", async (url) => {
        config.redisUrl = url;
        vi.stubEnv("TEST_REDIS_URL", url);
        await loadRedis();
        expect(RedisMock).toHaveBeenCalledWith(url, expect.any(Object));
    });

    it("does not impose test-only address rules in development mode", async () => {
        vi.stubEnv("NODE_ENV", "development");
        config.redisUrl = "redis://example.com:6379/0";
        vi.stubEnv("TEST_REDIS_URL", undefined);

        await loadRedis();
        expect(RedisMock).toHaveBeenCalledWith(config.redisUrl, expect.any(Object));
    });

    it("retries with bounded linear backoff and eventually stops retrying", async () => {
        await loadRedis();
        const options = RedisMock.mock.calls[0]?.[1] as {
            retryStrategy: (attempt: number) => number | null;
        };
        const retry = options.retryStrategy;

        expect(retry(1)).toBe(200);
        expect(retry(5)).toBe(1000);
        expect(retry(10)).toBe(2000);
        expect(retry(11)).toBeNull();
    });

    it("registers lifecycle events and logs them without leaking connection details", async () => {
        await loadRedis();
        expect(onMock).toHaveBeenCalledTimes(5);

        const handler = (event: string) => {
            const call = onMock.mock.calls.find(([name]) => name === event);
            expect(call).toBeDefined();
            return call?.[1] as (...args: unknown[]) => void;
        };

        handler("connect")();
        handler("ready")();
        handler("close")();
        handler("end")();
        const error = new Error("connection refused");
        handler("error")(error);

        expect(infoMock).toHaveBeenCalledWith("Redis connected");
        expect(infoMock).toHaveBeenCalledWith("Redis ready");
        expect(warnMock).toHaveBeenCalledWith("Redis connection closed");
        expect(warnMock).toHaveBeenCalledWith("Redis connection ended");
        expect(errorMock).toHaveBeenCalledWith({ err: error }, "Redis connection error");
    });
});
