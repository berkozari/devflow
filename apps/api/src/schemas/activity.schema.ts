
import { z } from "zod";

export const activityParamsSchema = z.object({
    projectId: z.string().uuid(),
});

export const taskActivityParamsSchema = z.object({
    projectId: z.string().uuid(),
    taskId: z.string().uuid(),
});

export const activityQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ActivityQuery = z.infer<
    typeof activityQuerySchema
>;
