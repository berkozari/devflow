
import { prisma } from "../config/database.js";

import type {
    Prisma,
} from "../generated/prisma/client.js";

import type {
    NotificationQuery,
} from "../schemas/notification.schema.js";

export const notificationRepository = {
    create(
        tx: Prisma.TransactionClient,
        data: {
            type: Prisma.NotificationCreateInput["type"];
            title: string;
            message?: string;
            userId: string;
            actorId?: string;
            projectId?: string;
            taskId?: string;
            metadata?: Prisma.InputJsonValue;
        },
    ) {
        return tx.notification.create({
            data: {
                type: data.type,
                title: data.title,
                message: data.message,
                userId: data.userId,
                actorId: data.actorId,
                projectId: data.projectId,
                taskId: data.taskId,
                metadata: data.metadata,
            },
        });
    },

    findById(
        userId: string,
        notificationId: string,
    ) {
        return prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    },

    findMany(
        userId: string,
        query: NotificationQuery,
    ) {
        const where = {
            userId,
            ...(query.unreadOnly
                ? { readAt: null }
                : {}),
        };

        return prisma.$transaction([
            prisma.notification.findMany({
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
                },
            }),

            prisma.notification.count({
                where,
            }),
        ]);
    },

    countUnread(userId: string) {
        return prisma.notification.count({
            where: {
                userId,
                readAt: null,
            },
        });
    },

    markAsRead(
        userId: string,
        notificationId: string,
    ) {
        return prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId,
            },
            data: {
                readAt: new Date(),
            },
        });
    },

    markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: {
                userId,
                readAt: null,
            },
            data: {
                readAt: new Date(),
            },
        });
    },

    delete(
        userId: string,
        notificationId: string,
    ) {
        return prisma.notification.deleteMany({
            where: {
                id: notificationId,
                userId,
            },
        });
    },

    deleteAll(userId: string) {
        return prisma.notification.deleteMany({
            where: {
                userId,
            },
        });
    },
};
