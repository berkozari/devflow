import { afterEach, describe, expect, it } from "vitest";

import { queryClient } from "@/lib/query-client";
import { ApiError } from "@/utils/api-error";

afterEach(() => {
    queryClient.clear();
});

function shouldRetry(failureCount: number, error: Error): boolean {
    const retry = queryClient.getDefaultOptions().queries?.retry;
    if (typeof retry !== "function") {
        throw new Error("Expected a query retry callback");
    }
    return retry(failureCount, error);
}

describe("queryClient", () => {
    it("configures the query cache and disables focus refetches", () => {
        expect(queryClient.getDefaultOptions().queries).toMatchObject({
            staleTime: 60_000,
            gcTime: 300_000,
            refetchOnWindowFocus: false,
        });
        expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0);
    });

    it.each([408, 500, 503])("retries a transient HTTP %i error once", (status) => {
        expect(shouldRetry(0, new ApiError("temporary", status))).toBe(true);
        expect(shouldRetry(1, new ApiError("temporary", status))).toBe(false);
    });

    it.each([400, 401, 403, 404, 422])("does not retry an HTTP %i error", (status) => {
        expect(shouldRetry(0, new ApiError("client error", status))).toBe(false);
    });

    it.each(["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"])(
        "retries one %s network failure",
        (code) => {
            expect(shouldRetry(0, new ApiError("network error", undefined, code))).toBe(true);
            expect(shouldRetry(1, new ApiError("network error", undefined, code))).toBe(false);
        },
    );

    it("does not retry unknown errors", () => {
        expect(shouldRetry(0, new Error("Unknown error"))).toBe(false);
        expect(shouldRetry(0, new ApiError("unknown"))).toBe(false);
    });
});
