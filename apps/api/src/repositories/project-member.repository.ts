import { prisma } from "../config/database.js";
import type { ProjectRole } from "../generated/prisma/client.js";

// Project ownership is defined by Project.ownerId; this repository must not
// assign OWNER or mutate the owner's membership through management endpoints.
type AssignableRole = Extract<ProjectRole, "ADMIN" | "MEMBER">;

export const projectMemberRepository = {
    findProject(projectId: string) {
        return prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                ownerId: true,
            },
        });
    },

    findProjectMember(projectId: string, userId: string) {
        return prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
        });
    },

    findProjectMembers(projectId: string) {
        return prisma.projectMember.findMany({
            where: { projectId },
            orderBy: [
                { createdAt: "asc" },
                { id: "asc" },
            ],
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    },

    findUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });
    },

    findProjectMembersByUserIds(projectId: string, userIds: string[]) {
        return prisma.projectMember.findMany({
            where: {
                projectId,
                userId: {
                    in: userIds,
                },
            },
            select: {
                userId: true,
            },
        });
    },

    create(projectId: string, userId: string, role: AssignableRole) {
        return prisma.projectMember.create({
            data: {
                projectId,
                userId,
                role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    },

    updateRole(projectId: string, userId: string, role: AssignableRole) {
        return prisma.projectMember.update({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
                role: {
                    in: ["ADMIN", "MEMBER"],
                },
                project: {
                    is: {
                        ownerId: { not: userId },
                    },
                },
            },
            data: { role },
        });
    },

    delete(
        projectId: string,
        userId: string,
        allowedRoles: AssignableRole[] = ["ADMIN", "MEMBER"],
    ) {
        return prisma.projectMember.deleteMany({
            where: {
                projectId,
                userId,
                role: {
                    in: allowedRoles,
                },
                project: {
                    is: {
                        ownerId: { not: userId },
                    },
                },
            },
        });
    },
};
