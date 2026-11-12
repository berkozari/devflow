
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

    async findMany(ownerId: string, query: ProjectQueryInput) {
        const { page, limit, search, status } = query;

        const where = {
            ownerId,
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

    findById(id: string, ownerId: string) {
        return prisma.project.findFirst({
            where: {
                id,
                ownerId,
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

    update(
        id: string,
        ownerId: string,
        data: UpdateProjectInput,
    ) {
        return prisma.project.updateMany({
            where: {
                id,
                ownerId,
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
