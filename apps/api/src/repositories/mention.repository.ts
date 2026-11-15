import { prisma } from "../config/database.js";

import type { Prisma } from "../generated/prisma/client.js";

export const mentionRepository = {
    createMany(
        commentId: string,
        userIds: string[],
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.mention.createMany({
            data: [...new Set(userIds)].map((userId) => ({
                commentId,
                userId,
            })),
            skipDuplicates: true,
        });
    },

    createManyReturningNew(
        commentId: string,
        userIds: string[],
        tx: Prisma.TransactionClient,
    ) {
        return tx.mention.createManyAndReturn({
            data: userIds.map((userId) => ({
                commentId,
                userId,
            })),
            skipDuplicates: true,
            select: {
                userId: true,
            },
        });
    },

    findByCommentId(
        commentId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.mention.findMany({
            where: { commentId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { createdAt: "asc" },
                { id: "asc" },
            ],
        });
    },

    deleteByCommentId(
        commentId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.mention.deleteMany({
            where: { commentId },
        });
    },
};
