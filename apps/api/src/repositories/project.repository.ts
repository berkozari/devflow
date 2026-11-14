
import { prisma } from "../config/database.js";

import type {
    CreateProjectInput,
    UpdateProjectInput,
    ProjectQueryInput,
} from "../schemas/project.schema.js";

export const projectRepository = {
    create(ownerId: string, data: CreateProjectInput) {
        return prisma.project.create({
            data: {
                ...data,
                ownerId,
                members: {
                    create: {
                        userId: ownerId,
                        role: "OWNER",
                    },
                },
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        members: true,
                        tasks: true,
                    },
                },
            },
        });
    },

    async findMany(userId: string, query: ProjectQueryInput) {
        const { page, limit, search, status } = query;

        const where = {
            OR: [
                { ownerId: userId },
                {
                    members: {
                        some: {
                            userId,
                        },
                    },
                },
            ],
            ...(status && { status }),
            ...(search && {
                name: {
                    contains: search,
                    mode: "insensitive" as const,
                },
            }),
        };

        const [projects, total] = await prisma.$transaction([
            prisma.project.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    _count: {
                        select: {
                            members: true,
                            tasks: true,
                        },
                    },
                },
            }),

            prisma.project.count({ where }),
        ]);

        return {
            projects,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    findById(id: string, userId: string) {
        return prisma.project.findFirst({
            where: {
                id,
                OR: [
                    { ownerId: userId },
                    {
                        members: {
                            some: {
                                userId,
                            },
                        },
                    },
                ],
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        tasks: true,
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

    findMember(projectId: string, userId: string) {
        return prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
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

    createMember(
        projectId: string,
        userId: string,
        role: "ADMIN" | "MEMBER",
    ) {
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

    deleteMember(projectId: string, userId: string) {
        return prisma.projectMember.deleteMany({
            where: {
                projectId,
                userId,
            },
        });
    },

    updateMemberRole(
        projectId: string,
        userId: string,
        role: "ADMIN" | "MEMBER",
    ) {
        return prisma.projectMember.update({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
            data: { role },
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

    update(
        id: string,
        userId: string,
        data: UpdateProjectInput,
    ) {
        return prisma.project.updateMany({
            where: {
                id,
                OR: [
                    { ownerId: userId },
                    {
                        members: {
                            some: {
                                userId,
                                role: "ADMIN",
                            },
                        },
                    },
                ],
            },
            data,
        });
    },

    delete(id: string, ownerId: string) {
        return prisma.project.deleteMany({
            where: {
                id,
                ownerId,
            },
        });
    },
};
