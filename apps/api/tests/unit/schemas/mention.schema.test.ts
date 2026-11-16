import { describe, expect, it } from "vitest";

import {
    createMentionSchema,
    mentionParamsSchema,
} from "../../../src/schemas/mention.schema.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000002";
const COMMENT_ID = "00000000-0000-4000-8000-000000000003";
const userId = (n: number) =>
    `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;

describe("Mention schemas", () => {
    describe("createMentionSchema", () => {
        it("accepts a single valid user ID", () => {
            expect(createMentionSchema.parse({ userIds: [userId(1)] })).toEqual({
                userIds: [userId(1)],
            });
        });

        it("accepts exactly 20 distinct valid user IDs", () => {
            const userIds = Array.from({ length: 20 }, (_, n) => userId(n + 1));
            expect(createMentionSchema.safeParse({ userIds }).success).toBe(true);
        });

        it("rejects an empty mention list", () => {
            const result = createMentionSchema.safeParse({ userIds: [] });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0]?.message).toBe(
                    "At least one mentioned user is required",
                );
            }
        });

        it("rejects more than 20 mentions", () => {
            const userIds = Array.from({ length: 21 }, (_, n) => userId(n + 1));
            const result = createMentionSchema.safeParse({ userIds });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.map((issue) => issue.message)).toContain(
                    "You cannot mention more than 20 users",
                );
            }
        });

        it("rejects duplicate user IDs", () => {
            const result = createMentionSchema.safeParse({
                userIds: [userId(1), userId(1)],
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.map((issue) => issue.message)).toContain(
                    "Duplicate mentioned users are not allowed",
                );
            }
        });

        it("rejects invalid UUIDs", () => {
            expect(createMentionSchema.safeParse({
                userIds: ["not-a-uuid"],
            }).success).toBe(false);
        });

        it("rejects a string instead of an array", () => {
            expect(createMentionSchema.safeParse({
                userIds: userId(1),
            }).success).toBe(false);
        });

        it("requires userIds", () => {
            expect(createMentionSchema.safeParse({}).success).toBe(false);
        });
    });

    describe("mentionParamsSchema", () => {
        const validParams = {
            projectId: PROJECT_ID,
            taskId: TASK_ID,
            commentId: COMMENT_ID,
        };

        it("accepts valid route parameters", () => {
            expect(mentionParamsSchema.parse(validParams)).toEqual(validParams);
        });

        it.each(["projectId", "taskId", "commentId"] as const)(
            "rejects invalid %s",
            (field) => {
                expect(mentionParamsSchema.safeParse({
                    ...validParams,
                    [field]: "invalid-id",
                }).success).toBe(false);
            },
        );

        it.each(["projectId", "taskId", "commentId"] as const)(
            "requires %s",
            (field) => {
                const input: Record<string, string> = { ...validParams };
                delete input[field];
                expect(mentionParamsSchema.safeParse(input).success).toBe(false);
            },
        );
    });
});
