
import { z } from "zod";

export const createMentionSchema = z.object({
    userIds: z
        .array(z.string().uuid())
        .min(1, "At least one mentioned user is required")
        .max(20, "You cannot mention more than 20 users")
        .refine(
            (userIds) => new Set(userIds).size === userIds.length,
            "Duplicate mentioned users are not allowed",
        ),
});

export const mentionParamsSchema = z.object({
    projectId: z.string().uuid(),
    taskId: z.string().uuid(),
    commentId: z.string().uuid(),
});

export type CreateMentionInput = z.infer<
    typeof createMentionSchema
>;
