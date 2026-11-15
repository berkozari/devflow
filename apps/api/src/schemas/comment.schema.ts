
import { z } from "zod";

const commentContentSchema = z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment cannot exceed 5000 characters");

const mentionedUserIdsSchema = z
    .array(z.string().uuid())
    .max(50, "You cannot mention more than 50 users")
    .transform((ids) => [...new Set(ids)])
    .default([]);

export const createCommentSchema = z.object({
    content: commentContentSchema,

    mentionedUserIds: mentionedUserIdsSchema,
});

export const updateCommentSchema = z.object({
    content: commentContentSchema,
});

export const commentRouteParamsSchema = z.object({
    projectId: z.string().uuid(),
    taskId: z.string().uuid(),
});

export const commentItemParamsSchema =
    commentRouteParamsSchema.extend({
        commentId: z.string().uuid(),
    });

export const commentQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10),
});

export type CreateCommentInput = z.infer<
    typeof createCommentSchema
>;

export type UpdateCommentInput = z.infer<
    typeof updateCommentSchema
>;

export type CommentQuery = z.infer<
    typeof commentQuerySchema
>;
