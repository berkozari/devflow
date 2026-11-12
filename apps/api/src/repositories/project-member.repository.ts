
import { prisma } from "../config/database.js";
import type { ProjectRole } from "../generated/prisma/client.js";

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
            orderBy: {
                createdAt: "asc",
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

    create(projectId: string, userId: string, role: ProjectRole) {
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

    updateRole(
        projectId: string,
        userId: string,
        role: ProjectRole,
    ) {
        return prisma.projectMember.update({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
            data: { role },
        });
    },

    delete(projectId: string, userId: string) {
        return prisma.projectMember.delete({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
        });
    },
};
