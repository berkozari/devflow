
import { projectRepository } from "../repositories/project.repository.js";
import { AppError } from "../utils/app-error.js";

import type {
    CreateProjectInput,
    UpdateProjectInput,
    ProjectQueryInput,
} from "../schemas/project.schema.js";

type ProjectAccessRole = "OWNER" | "ADMIN" | "MEMBER";

function getProjectRole(
    project: {
        ownerId: string;
        members: Array<{
            userId: string;
            role: ProjectAccessRole;
        }>;
    },
    userId: string,
): ProjectAccessRole {
    // Project.ownerId is the canonical owner reference.
    if (project.ownerId === userId) {
        return "OWNER";
    }

    const membership = project.members.find(
        (member) => member.userId === userId,
    );

    if (!membership) {
        throw new AppError(
            "Insufficient project permissions",
            403,
        );
    }

    return membership.role;
}

export const projectService = {
    async create(userId: string, data: CreateProjectInput) {
        return projectRepository.create(userId, data);
    },

    async findMany(userId: string, query: ProjectQueryInput) {
        return projectRepository.findMany(userId, query);
    },

    async findById(projectId: string, userId: string) {
        const project = await projectRepository.findById(
            projectId,
            userId,
        );

        if (!project) {
            throw new AppError("Project not found", 404);
        }

        return project;
    },

    async update(
        projectId: string,
        userId: string,
        data: UpdateProjectInput,
    ) {
        const existingProject = await projectRepository.findById(
            projectId,
            userId,
        );

        if (!existingProject) {
            throw new AppError("Project not found", 404);
        }

        const actorRole = getProjectRole(
            existingProject,
            userId,
        );

        if (actorRole !== "OWNER" && actorRole !== "ADMIN") {
            throw new AppError(
                "Insufficient project permissions",
                403,
            );
        }

        const result = await projectRepository.update(
            projectId,
            userId,
            data,
        );

        if (result.count === 0) {
            throw new AppError(
                "Project not found or access denied",
                404,
            );
        }

        const updatedProject = await projectRepository.findById(
            projectId,
            userId,
        );

        if (!updatedProject) {
            throw new AppError("Project not found", 404);
        }

        return updatedProject;
    },

    async delete(projectId: string, userId: string) {
        const existingProject = await projectRepository.findById(
            projectId,
            userId,
        );

        if (!existingProject) {
            throw new AppError("Project not found", 404);
        }

        const actorRole = getProjectRole(
            existingProject,
            userId,
        );

        if (actorRole !== "OWNER") {
            throw new AppError(
                "Only the project owner can delete this project",
                403,
            );
        }

        const result = await projectRepository.delete(
            projectId,
            userId,
        );

        if (result.count === 0) {
            throw new AppError("Project not found", 404);
        }

        return { success: true };
    },
};
