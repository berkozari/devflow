
import { z } from "zod";

const projectNameSchema = z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name cannot exceed 100 characters");

const projectDescriptionSchema = z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters");

const projectStatusSchema = z.enum([
    "PLANNING",
    "ACTIVE",
    "COMPLETED",
    "ARCHIVED",
]);

export const createProjectSchema = z.object({
    name: projectNameSchema,
    description: projectDescriptionSchema.optional(),
});

export const updateProjectSchema = z
    .object({
        name: projectNameSchema.optional(),

        description: projectDescriptionSchema
            .nullable()
            .optional(),

        status: projectStatusSchema.optional(),
    })
    .refine(
        (data) =>
            Object.values(data).some(
                (value) => value !== undefined,
            ),
        "At least one field must be provided",
    );

export const projectParamsSchema = z.object({
    id: z.string().uuid("Invalid project ID"),
});

export const projectQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10),

    search: z.string().trim().max(100).optional(),

    status: projectStatusSchema.optional(),
});

export const addProjectMemberSchema = z.object({
    email: z
        .string()
        .trim()
        .max(254, "Email cannot exceed 254 characters")
        .email("Invalid email address")
        .transform((email) => email.toLowerCase()),

    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const updateProjectMemberSchema = z.object({
    role: z.enum(["ADMIN", "MEMBER"]),
});

export const projectMemberParamsSchema = z.object({
    id: z.string().uuid("Invalid project ID"),
    userId: z.string().uuid("Invalid user ID"),
});

export type CreateProjectInput = z.infer<
    typeof createProjectSchema
>;

export type UpdateProjectInput = z.infer<
    typeof updateProjectSchema
>;

export type ProjectQueryInput = z.infer<
    typeof projectQuerySchema
>;

export type AddProjectMemberInput = z.infer<
    typeof addProjectMemberSchema
>;

export type UpdateProjectMemberInput = z.infer<
    typeof updateProjectMemberSchema
>;
