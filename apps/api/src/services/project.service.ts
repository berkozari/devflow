
import { projectRepository } from "../repositories/project.repository.js";
import { AppError } from "../utils/app-error.js";

import type {
    CreateProjectInput,
    UpdateProjectInput,
    ProjectQueryInput,
    AddProjectMemberInput,
    UpdateProjectMemberInput,
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

    if (membership.role === "OWNER") {
        throw new AppError(
            "Invalid project membership role",
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

    async getMembers(projectId: string, actorId: string) {
        const project = await projectRepository.findById(
            projectId,
            actorId,
        );

        if (!project) {
            throw new AppError("Project not found", 404);
        }

        return project.members;
    },

    async addMember(
        projectId: string,
        actorId: string,
        data: AddProjectMemberInput,
    ) {
        const project = await projectRepository.findById(
            projectId,
            actorId,
        );

        if (!project) {
            throw new AppError("Project not found", 404);
        }

        const actorRole = getProjectRole(project, actorId);

        if (actorRole === "MEMBER") {
            throw new AppError("Insufficient project permissions", 403);
        }

        if (actorRole === "ADMIN" && data.role === "ADMIN") {
            throw new AppError(
                "Only the project owner can assign ADMIN role",
                403,
            );
        }

        const user = await projectRepository.findUserByEmail(
            data.email,
        );

        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.id === project.ownerId) {
            throw new AppError(
                "Project owner is already assigned",
                409,
            );
        }

        const existingMember = await projectRepository.findMember(
            projectId,
            user.id,
        );

        if (existingMember) {
            throw new AppError(
                "User is already a project member",
                409,
            );
        }

        return projectRepository.createMember(
            projectId,
            user.id,
            data.role,
        );
    },

    async updateMemberRole(
        projectId: string,
        actorId: string,
        targetUserId: string,
        data: UpdateProjectMemberInput,
    ) {
        const project = await projectRepository.findById(
            projectId,
            actorId,
        );

        if (!project) {
            throw new AppError("Project not found", 404);
        }

        const actorRole = getProjectRole(project, actorId);

        if (actorRole !== "OWNER") {
            throw new AppError(
                "Only the project owner can change member roles",
                403,
            );
        }

        if (targetUserId === project.ownerId) {
            throw new AppError(
                "Project owner role cannot be changed",
                403,
            );
        }

        const targetMember = await projectRepository.findMember(
            projectId,
            targetUserId,
        );

        if (!targetMember) {
            throw new AppError("Project member not found", 404);
        }

        return projectRepository.updateMemberRole(
            projectId,
            targetUserId,
            data.role,
        );
    },

    async removeMember(
        projectId: string,
        actorId: string,
        targetUserId: string,
    ) {
        const project = await projectRepository.findById(
            projectId,
            actorId,
        );

        if (!project) {
            throw new AppError("Project not found", 404);
        }

        const actorRole = getProjectRole(project, actorId);

        if (actorRole === "MEMBER") {
            throw new AppError(
                "Insufficient project permissions",
                403,
            );
        }

        if (targetUserId === project.ownerId) {
            throw new AppError(
                "Project owner cannot be removed",
                403,
            );
        }

        const targetMember = await projectRepository.findMember(
            projectId,
            targetUserId,
        );

        if (!targetMember) {
            throw new AppError("Project member not found", 404);
        }

        if (
            actorRole === "ADMIN" &&
            targetMember.role !== "MEMBER"
        ) {
            throw new AppError(
                "Admins can only remove MEMBER users",
                403,
            );
        }

        await projectRepository.deleteMember(
            projectId,
            targetUserId,
        );

        return { success: true };
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
