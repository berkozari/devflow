
import { prisma } from "../config/database.js";

import type { Prisma } from "../generated/prisma/client.js";

import type {
    CreateTaskInput,
    UpdateTaskInput,
    TaskQuery,
} from "../schemas/task.schema.js";

export const taskRepository = {
    create(
        projectId: string,
        creatorId: string,
        data: CreateTaskInput,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.create({
            data: {
                title: data.title,
                description: data.description,
                status: data.status,
                priority: data.priority,
                assigneeId: data.assigneeId,
                dueDate: data.dueDate
                    ? new Date(data.dueDate)
                    : data.dueDate,
                projectId,
                creatorId,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    },

    findById(projectId: string, taskId: string) {
        return prisma.task.findFirst({
            where: {
                id: taskId,
                projectId,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    },

    async findMany(
        projectId: string,
        query: TaskQuery,
    ) {
        const {
            page,
            limit,
            status,
            priority,
            assigneeId,
            search,
            sortBy,
            sortOrder,
        } = query;

        const where = {
            projectId,

            ...(status && { status }),

            ...(priority && { priority }),

            ...(assigneeId && { assigneeId }),

            ...(search && {
                OR: [
                    {
                        title: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                    {
                        description: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                ],
            }),
        };

        const [tasks, total] = await prisma.$transaction([
            prisma.task.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                include: {
                    assignee: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            }),

            prisma.task.count({ where }),
        ]);

        return {
            tasks,
            total,
        };
    },

    update(
        projectId: string,
        taskId: string,
        data: UpdateTaskInput,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.updateMany({
            where: {
                id: taskId,
                projectId,
            },
            data: {
                ...data,

                dueDate:
                    data.dueDate !== undefined
                        ? data.dueDate
                            ? new Date(data.dueDate)
                            : null
                        : undefined,
            },
        });
    },

    delete(
        projectId: string,
        taskId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.deleteMany({
            where: {
                id: taskId,
                projectId,
            },
        });
    },
};
