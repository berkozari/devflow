
import { z } from "zod";

export const createProjectSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3, "Project name must be at least 3 characters")
        .max(100, "Project name cannot exceed 100 characters"),

    description: z
        .string()
        .trim()
        .max(1000, "Description cannot exceed 1000 characters")
        .optional(),
});

export const updateProjectSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3, "Project name must be at least 3 characters")
        .max(100, "Project name cannot exceed 100 characters"),

    description: z
        .string()
        .trim()
        .max(1000, "Description cannot exceed 1000 characters"),

    status: z.enum([
        "PLANNING",
        "ACTIVE",
        "COMPLETED",
        "ARCHIVED",
    ]),
});

export const addProjectMemberSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Invalid email address")
        .max(255)
        .transform((email) => email.toLowerCase()),

    role: z
        .enum(["ADMIN", "MEMBER"])
        .default("MEMBER"),
});

export const updateProjectMemberSchema = z.object({
    role: z.enum(["ADMIN", "MEMBER"]),
});

export const projectMemberParamsSchema = z.object({
    id: z.string().uuid("Invalid project ID"),
    userId: z.string().uuid("Invalid user ID"),
});

export type CreateProjectFormValues = z.infer<
    typeof createProjectSchema
>;

export type UpdateProjectFormValues = z.infer<
    typeof updateProjectSchema
>;

export type AddProjectMemberInput = z.infer<
    typeof addProjectMemberSchema
>;

export type UpdateProjectMemberInput = z.infer<
    typeof updateProjectMemberSchema
>;