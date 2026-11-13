
import { prisma } from "../config/database.js";

import type {
    ActivityQuery,
} from "../schemas/activity.schema.js";

import type {
    Prisma,
    ActivityAction,
} from "../generated/prisma/client.js";

export const activityRepository = {
    create(
        tx: Prisma.TransactionClient,
        data: {
            action: ActivityAction;
            projectId: string;
            actorId: string;
            taskId?: string;
            metadata?: Prisma.InputJsonValue;
        },
    ) {
        return tx.activityLog.create({
            data: {
                action: data.action,
                projectId: data.projectId,
                actorId: data.actorId,
                taskId: data.taskId,
                metadata: data.metadata,
            },
        });
    },

    findMany(
        projectId: string,
        query: ActivityQuery,
        taskId?: string,
    ) {
        const where = {
            projectId,
            ...(taskId ? { taskId } : {}),
        };

        return prisma.$transaction([
            prisma.activityLog.findMany({
                where,
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    actor: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    task: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                        },
                    },
                },
            }),

            prisma.activityLog.count({
                where,
            }),
        ]);
    },
};
