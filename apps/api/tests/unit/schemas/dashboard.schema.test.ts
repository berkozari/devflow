import { describe, expect, it } from "vitest";
import { dashboardQuerySchema } from "../../../src/schemas/dashboard.schema.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";

describe("Dashboard Query Schema", () => {
    it("accepts an empty query", () => {
        expect(dashboardQuerySchema.safeParse({}).success).toBe(true);
    });

    it("accepts valid projectId", () => {
        expect(dashboardQuerySchema.safeParse({ projectId: PROJECT_ID }).success).toBe(true);
    });

    it("accepts an interval with UTC ISO datetimes", () => {
        expect(dashboardQuerySchema.safeParse({
            startDate: "2026-11-14T08:00:00Z",
            endDate: "2026-11-15T18:00:00Z",
        }).success).toBe(true);
    });

    it("allows equal start and end times", () => {
        const timestamp = "2026-11-15T10:00:00Z";
        expect(dashboardQuerySchema.safeParse({
            startDate: timestamp, endDate: timestamp,
        }).success).toBe(true);
    });

    it("accepts one boundary without the other", () => {
        expect(dashboardQuerySchema.safeParse({ startDate: "2026-11-14T00:00:00Z" }).success).toBe(true);
        expect(dashboardQuerySchema.safeParse({ endDate: "2026-11-15T00:00:00Z" }).success).toBe(true);
    });

    it("rejects a reversed date interval", () => {
        const result = dashboardQuerySchema.safeParse({
            startDate: "2026-11-15T10:00:00Z",
            endDate: "2026-11-14T10:00:00Z",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    path: ["endDate"],
                    message: "Start date must be before or equal to end date",
                }),
            ]));
        }
    });

    it("rejects date-only and malformed timestamps", () => {
        expect(dashboardQuerySchema.safeParse({ startDate: "2026-11-15" }).success).toBe(false);
        expect(dashboardQuerySchema.safeParse({ endDate: "not-a-date" }).success).toBe(false);
    });

    it("rejects invalid project IDs", () => {
        expect(dashboardQuerySchema.safeParse({ projectId: "invalid-id" }).success).toBe(false);
    });
});
