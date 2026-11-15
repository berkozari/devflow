import { notificationRepository } from "../repositories/notification.repository.js";
import { AppError } from "../utils/app-error.js";

import type { NotificationQuery } from "../schemas/notification.schema.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { CreateNotificationData } from "../repositories/notification.repository.js";

export const notificationService = {
    async findMany(userId: string, query: NotificationQuery) {
        const [notifications, total] = await notificationRepository.findMany(
            userId,
            query,
        );

        return {
            notifications,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        };
    },

    async getUnreadCount(userId: string) {
        return notificationRepository.countUnread(userId);
    },

    async markAsRead(userId: string, notificationId: string) {
        const result = await notificationRepository.markAsRead(
            userId,
            notificationId,
        );

        if (result.count === 0) {
            // An already-read notification should be idempotently successful.
            const existing = await notificationRepository.findById(
                userId,
                notificationId,
            );

            if (!existing) {
                throw new AppError("Notification not found", 404);
            }
        }
    },

    async markAllAsRead(userId: string) {
        return notificationRepository.markAllAsRead(userId);
    },

    async create(tx: Prisma.TransactionClient, data: CreateNotificationData) {
        return notificationRepository.create(tx, data);
    },

    async createMany(
        tx: Prisma.TransactionClient,
        notifications: CreateNotificationData[],
    ) {
        return notificationRepository.createMany(tx, notifications);
    },

    async delete(userId: string, notificationId: string) {
        const result = await notificationRepository.delete(
            userId,
            notificationId,
        );

        if (result.count === 0) {
            throw new AppError("Notification not found", 404);
        }
    },

    async deleteAll(userId: string) {
        return notificationRepository.deleteAll(userId);
    },
};
