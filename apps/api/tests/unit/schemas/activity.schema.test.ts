import { describe, expect, it } from "vitest";

import {
    activityParamsSchema,
    taskActivityParamsSchema,
    activityQuerySchema,
} from "../../../src/schemas/activity.schema.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000002";

describe("Activity Schemas", () => {
    describe("activityParamsSchema", () => {
        it("accepts a valid project UUID", () => {
            expect(activityParamsSchema.parse({ projectId: PROJECT_ID })).toEqual({
                projectId: PROJECT_ID,
            });
        });

        it.each(["not-a-uuid", "", "1234"])(
            "rejects an invalid project ID: %s",
            (projectId) => {
                expect(activityParamsSchema.safeParse({ projectId }).success).toBe(false);
            },
        );

        it("requires projectId", () => {
            expect(activityParamsSchema.safeParse({}).success).toBe(false);
        });
    });

    describe("taskActivityParamsSchema", () => {
        const params = { projectId: PROJECT_ID, taskId: TASK_ID };

        it("accepts valid project and task UUIDs", () => {
            expect(taskActivityParamsSchema.parse(params)).toEqual(params);
        });

        it.each(["projectId", "taskId"] as const)(
            "rejects an invalid %s",
            (field) => {
                expect(taskActivityParamsSchema.safeParse({
                    ...params,
                    [field]: "bad-id",
                }).success).toBe(false);
            },
        );

        it.each(["projectId", "taskId"] as const)(
            "requires %s",
            (field) => {
                const input: Record<string, string> = { ...params };
                delete input[field];
                expect(taskActivityParamsSchema.safeParse(input).success).toBe(false);
            },
        );
    });

    describe("activityQuerySchema", () => {
        it("defaults to page 1 and limit 10", () => {
            expect(activityQuerySchema.parse({})).toEqual({ page: 1, limit: 10 });
        });

        it("coerces valid page and limit strings to numbers", () => {
            expect(activityQuerySchema.parse({ page: "3", limit: "25" })).toEqual({
                page: 3,
                limit: 25,
            });
        });

        it("accepts boundary values", () => {
            expect(activityQuerySchema.parse({ page: 1, limit: 100 })).toEqual({
                page: 1,
                limit: 100,
            });
        });

        it.each([
            { page: 0 },
            { page: -1 },
            { page: "1.5" },
            { page: "abc" },
            { limit: 0 },
            { limit: -5 },
            { limit: 101 },
            { limit: "2.5" },
            { limit: "abc" },
        ])("rejects an invalid query: %j", (query) => {
            expect(activityQuerySchema.safeParse(query).success).toBe(false);
        });
    });
});
