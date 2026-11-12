
import { z } from "zod";

export const addProjectMemberSchema = z.object({
    email: z.string().trim().email("Invalid email address"),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const updateProjectMemberSchema = z.object({
    role: z.enum(["ADMIN", "MEMBER"]),
});

export const projectMemberParamsSchema = z.object({
    projectId: z.string().uuid(),
    userId: z.string().uuid(),
});

export const projectIdParamsSchema = z.object({
    projectId: z.string().uuid(),
});

export type AddProjectMemberInput = z.infer<
    typeof addProjectMemberSchema
>;

export type UpdateProjectMemberInput = z.infer<
    typeof updateProjectMemberSchema
>;
