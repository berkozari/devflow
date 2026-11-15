
import { z } from "zod";

export const taskStatusSchema = z.enum([
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "DONE",
]);

export const taskPrioritySchema = z.enum([
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
]);

const taskTitleSchema = z
    .string()
    .trim()
    .min(2, "Title must contain at least 2 characters")
    .max(150, "Title cannot exceed 150 characters");

const taskDescriptionSchema = z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .nullable();

const taskAssigneeSchema = z.string().uuid().nullable();

const taskDueDateSchema = z.iso.datetime().nullable();

export const createTaskSchema = z.object({
    title: taskTitleSchema,

    description: taskDescriptionSchema.optional(),

    status: taskStatusSchema.optional(),

    priority: taskPrioritySchema.optional(),

    assigneeId: taskAssigneeSchema.optional(),

    dueDate: taskDueDateSchema.optional(),
});

export const updateTaskSchema = z
    .object({
        title: taskTitleSchema.optional(),

        description: taskDescriptionSchema.optional(),

        status: taskStatusSchema.optional(),

        priority: taskPrioritySchema.optional(),

        assigneeId: taskAssigneeSchema.optional(),

        dueDate: taskDueDateSchema.optional(),
    })
    .refine(
        (data) =>
            Object.values(data).some(
                (value) => value !== undefined,
            ),
        "At least one field must be provided",
    );

export const taskParamsSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
    taskId: z.string().uuid("Invalid task ID"),
});

export const taskProjectParamsSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
});

export const taskQuerySchema = z.object({
    status: taskStatusSchema.optional(),

    priority: taskPrioritySchema.optional(),

    assigneeId: z.string().uuid().optional(),

    search: z.string().trim().max(150).optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10),

    sortBy: z
        .enum(["createdAt", "updatedAt", "dueDate", "title"])
        .default("createdAt"),

    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const moveTaskSchema = z.object({
    status: taskStatusSchema,

    beforeTaskId: z.string().uuid().nullable(),
});

export type CreateTaskInput = z.infer<
    typeof createTaskSchema
>;

export type UpdateTaskInput = z.infer<
    typeof updateTaskSchema
>;

export type TaskQuery = z.infer<typeof taskQuerySchema>;

export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
