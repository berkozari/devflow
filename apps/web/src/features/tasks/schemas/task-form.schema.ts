
import { z } from "zod";

export const taskFormSchema = z.object({
    title: z
        .string()
        .trim()
        .min(2, "Title must be at least 2 characters.")
        .max(150, "Title cannot exceed 150 characters."),

    description: z
        .string()
        .max(5000, "Description cannot exceed 5000 characters."),

    status: z.enum([
        "TODO",
        "IN_PROGRESS",
        "IN_REVIEW",
        "DONE",
    ]),

    priority: z.enum([
        "LOW",
        "MEDIUM",
        "HIGH",
        "URGENT",
    ]),

    assigneeId: z.string(),

    dueDate: z.string(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
