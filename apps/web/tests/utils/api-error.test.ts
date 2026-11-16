import { describe, expect, it } from "vitest";

import { ApiError } from "@/utils/api-error";

describe("ApiError", () => {
    it("preserves message, status, code and validation details", () => {
        const errors = [{ field: "email", message: "Invalid email" }];
        const error = new ApiError("Validation failed", 422, "BAD_REQUEST", errors);

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.name).toBe("ApiError");
        expect(error.message).toBe("Validation failed");
        expect(error.status).toBe(422);
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.errors).toEqual(errors);
    });

    it("allows network errors with no HTTP status or validation details", () => {
        const error = new ApiError("Unable to connect", undefined, "ERR_NETWORK");

        expect(error.status).toBeUndefined();
        expect(error.code).toBe("ERR_NETWORK");
        expect(error.errors).toBeUndefined();
    });

    it("preserves stack information", () => {
        const error = new ApiError("Unexpected error");
        expect(error.stack).toContain("ApiError");
    });
});
