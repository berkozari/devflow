import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, set, del, scan, exists } = vi.hoisted(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
    exists: vi.fn(),
}));

vi.mock("../../../src/config/redis.js", () => ({
    redis: { get, set, del, scan, exists },
}));

import { cache } from "../../../src/lib/cache.js";

describe("Cache Library", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("get", () => {
        it("returns parsed JSON for an existing cache entry", async () => {
            const value = { count: 2, entries: ["first", "second"] };
            get.mockResolvedValue(JSON.stringify(value));

            await expect(cache.get<typeof value>("dashboard:one")).resolves.toEqual(value);
            expect(get).toHaveBeenCalledTimes(1);
            expect(get).toHaveBeenCalledWith("dashboard:one");
            expect(del).not.toHaveBeenCalled();
        });

        it.each([null, ""])("returns null for an absent/empty value (%s)", async (raw) => {
            get.mockResolvedValue(raw);
            await expect(cache.get("missing")).resolves.toBeNull();
            expect(del).not.toHaveBeenCalled();
        });

        it("supports valid JSON primitive values", async () => {
            get.mockResolvedValueOnce("0").mockResolvedValueOnce("false");
            await expect(cache.get<number>("zero")).resolves.toBe(0);
            await expect(cache.get<boolean>("false")).resolves.toBe(false);
        });

        it("deletes malformed JSON and treats it as a cache miss", async () => {
            get.mockResolvedValue("not-json{");
            del.mockResolvedValue(1);

            await expect(cache.get("broken")).resolves.toBeNull();
            expect(del).toHaveBeenCalledTimes(1);
            expect(del).toHaveBeenCalledWith("broken");
        });

        it("propagates a Redis read error", async () => {
            const error = new Error("Redis GET failed");
            get.mockRejectedValue(error);

            await expect(cache.get("key")).rejects.toBe(error);
            expect(del).not.toHaveBeenCalled();
        });

        it("propagates deletion errors while purging malformed JSON", async () => {
            get.mockResolvedValue("{");
            const error = new Error("Redis DEL failed");
            del.mockRejectedValue(error);

            await expect(cache.get("corrupt")).rejects.toBe(error);
        });
    });

    describe("set", () => {
        it("serializes values with the default 300-second expiration", async () => {
            set.mockResolvedValue("OK");
            await cache.set("cache:entry", { active: true });

            expect(set).toHaveBeenCalledTimes(1);
            expect(set).toHaveBeenCalledWith(
                "cache:entry",
                '{"active":true}',
                "EX",
                300,
            );
        });

        it("uses a caller-provided TTL", async () => {
            set.mockResolvedValue("OK");
            await cache.set("custom", [1, 2], 45);
            expect(set).toHaveBeenCalledTimes(1);
            expect(set).toHaveBeenCalledWith("custom", "[1,2]", "EX", 45);
        });

        it("propagates write failures", async () => {
            const error = new Error("Redis SET failed");
            set.mockRejectedValue(error);
            await expect(cache.set("key", 1)).rejects.toBe(error);
        });

        it("does not call Redis when the value cannot be serialized", async () => {
            const cyclic: { self?: unknown } = {};
            cyclic.self = cyclic;

            await expect(cache.set("cyclic", cyclic)).rejects.toThrow();
            expect(set).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("deletes exactly the requested key", async () => {
            del.mockResolvedValue(1);
            await cache.delete("owner:one");
            expect(del).toHaveBeenCalledTimes(1);
            expect(del).toHaveBeenCalledWith("owner:one");
        });

        it("propagates deletion failures", async () => {
            const error = new Error("Redis DEL failed");
            del.mockRejectedValue(error);
            await expect(cache.delete("key")).rejects.toBe(error);
        });
    });

    describe("deleteByPattern", () => {
        it("deletes matching keys across multiple SCAN pages", async () => {
            scan.mockResolvedValueOnce(["42", ["dashboard:a", "dashboard:b"]])
                .mockResolvedValueOnce(["0", ["dashboard:c"]]);
            del.mockResolvedValue(1);

            await cache.deleteByPattern("dashboard:*");

            expect(scan).toHaveBeenNthCalledWith(1, "0", "MATCH", "dashboard:*", "COUNT", 100);
            expect(scan).toHaveBeenNthCalledWith(2, "42", "MATCH", "dashboard:*", "COUNT", 100);
            expect(del).toHaveBeenNthCalledWith(1, "dashboard:a", "dashboard:b");
            expect(del).toHaveBeenNthCalledWith(2, "dashboard:c");
        });

        it("does not call DEL when SCAN finds no matches", async () => {
            scan.mockResolvedValue(["0", []]);
            await cache.deleteByPattern("none:*");
            expect(scan).toHaveBeenCalledOnce();
            expect(del).not.toHaveBeenCalled();
        });

        it("continues scanning after an empty intermediate page", async () => {
            scan.mockResolvedValueOnce(["17", []])
                .mockResolvedValueOnce(["0", ["cache:found"]]);
            del.mockResolvedValue(1);

            await cache.deleteByPattern("cache:*");
            expect(scan).toHaveBeenCalledTimes(2);
            expect(del).toHaveBeenCalledTimes(1);
            expect(del).toHaveBeenCalledWith("cache:found");
        });

        it("propagates SCAN errors instead of silently skipping invalidation", async () => {
            const error = new Error("Redis SCAN failed");
            scan.mockRejectedValue(error);
            await expect(cache.deleteByPattern("cache:*")).rejects.toBe(error);
        });

        it("propagates DEL errors in an invalidation batch", async () => {
            scan.mockResolvedValue(["0", ["cache:a"]]);
            const error = new Error("Redis DEL failed");
            del.mockRejectedValue(error);
            await expect(cache.deleteByPattern("cache:*")).rejects.toBe(error);
        });
    });

    describe("exists", () => {
        it("returns true only when Redis reports exactly one matching key", async () => {
            exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockResolvedValueOnce(2);

            await expect(cache.exists("a")).resolves.toBe(true);
            await expect(cache.exists("b")).resolves.toBe(false);
            await expect(cache.exists("c")).resolves.toBe(false);
            expect(exists).toHaveBeenCalledTimes(3);
        });

        it("propagates Redis EXISTS errors", async () => {
            const error = new Error("Redis EXISTS failed");
            exists.mockRejectedValue(error);
            await expect(cache.exists("key")).rejects.toBe(error);
        });
    });
});
