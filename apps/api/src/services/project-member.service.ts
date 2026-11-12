
import { Prisma } from "../generated/prisma/client.js";
import { projectMemberRepository } from "../repositories/project-member.repository.js";
import type {
    AddProjectMemberInput,
    UpdateProjectMemberInput,
} from "../schemas/project-member.schema.js";

import { AppError } from "../utils/app-error.js";

type ProjectRole = "OWNER" | "ADMIN" | "MEMBER";

function throwHttpError(
    statusCode: number,
    message: string,
): never {
    throw new AppError(message, statusCode);
}

async function getActorRole(
    projectId: string,
    actorId: string,
): Promise<ProjectRole> {
    const project = await projectMemberRepository.findProject(projectId);

    if (!project) {
        throwHttpError(404, "Project not found");
    }

    // Project.ownerId is the canonical owner reference.
    if (project.ownerId === actorId) {
        return "OWNER";
    }

    const membership =
        await projectMemberRepository.findProjectMember(
            projectId,
            actorId,
        );

    if (!membership) {
        throwHttpError(404, "Project not found");
    }

    return membership.role;
}

async function requireManager(
    projectId: string,
    actorId: string,
) {
    const role = await getActorRole(projectId, actorId);

    if (role !== "OWNER" && role !== "ADMIN") {
        throwHttpError(403, "Insufficient project permissions");
    }

    return role;
}

export const projectMemberService = {
    async findMembers(projectId: string, actorId: string) {
        await getActorRole(projectId, actorId);

        return projectMemberRepository.findProjectMembers(projectId);
    },

    async addMember(
        projectId: string,
        actorId: string,
        data: AddProjectMemberInput,
    ) {
        const actorRole = await requireManager(projectId, actorId);

        if (actorRole === "ADMIN" && data.role !== "MEMBER") {
            throwHttpError(
                403,
                "Admins can only add members with MEMBER role",
            );
        }

        const user = await projectMemberRepository.findUserByEmail(
            data.email,
        );

        if (!user) {
            throwHttpError(404, "User not found");
        }

        const project = await projectMemberRepository.findProject(projectId);

        if (project?.ownerId === user.id) {
            throwHttpError(409, "Project owner is already a member");
        }

        const existingMembership =
            await projectMemberRepository.findProjectMember(
                projectId,
                user.id,
            );

        if (existingMembership) {
            throwHttpError(409, "User is already a project member");
        }

        try {
            return await projectMemberRepository.create(
                projectId,
                user.id,
                data.role,
            );
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throwHttpError(
                    409,
                    "User is already a project member",
                );
            }

            throw error;
        }
    },

    async updateMemberRole(
        projectId: string,
        actorId: string,
        userId: string,
        data: UpdateProjectMemberInput,
    ) {
        const actorRole = await requireManager(projectId, actorId);

        const project = await projectMemberRepository.findProject(projectId);

        if (!project) {
            throwHttpError(404, "Project not found");
        }

        if (project.ownerId === userId) {
            throwHttpError(403, "Project owner role cannot be changed");
        }

        if (actorRole !== "OWNER") {
            throwHttpError(
                403,
                "Only the project owner can change member roles",
            );
        }

        const targetMembership =
            await projectMemberRepository.findProjectMember(
                projectId,
                userId,
            );

        if (!targetMembership) {
            throwHttpError(404, "Project member not found");
        }

        if (targetMembership.role === "OWNER") {
            throwHttpError(
                403,
                "Owner role cannot be changed through this endpoint",
            );
        }

        return projectMemberRepository.updateRole(
            projectId,
            userId,
            data.role,
        );
    },

    async removeMember(
        projectId: string,
        actorId: string,
        userId: string,
    ) {
        const actorRole = await requireManager(projectId, actorId);

        const project = await projectMemberRepository.findProject(projectId);

        if (!project) {
            throwHttpError(404, "Project not found");
        }

        if (project.ownerId === userId) {
            throwHttpError(403, "Project owner cannot be removed");
        }

        const targetMembership =
            await projectMemberRepository.findProjectMember(
                projectId,
                userId,
            );

        if (!targetMembership) {
            throwHttpError(404, "Project member not found");
        }

        if (targetMembership.role === "OWNER") {
            throwHttpError(
                403,
                "Project owner cannot be removed",
            );
        }

        if (
            actorRole === "ADMIN" &&
            targetMembership.role !== "MEMBER"
        ) {
            throwHttpError(
                403,
                "Admins can only remove regular members",
            );
        }

        return projectMemberRepository.delete(projectId, userId);
    },
};
