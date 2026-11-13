
import { prisma } from "../config/database.js";

import type { Prisma } from "../generated/prisma/client.js";

export const mentionRepository = {
    createMany(
        commentId: string,
        userIds: string[],
        createdBy: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.mention.createMany({
            data: userIds.map((userId) => ({
                commentId,
                userId,
                createdBy,
            })),
            skipDuplicates: true,
        });
    },

    findByCommentId(
        commentId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.mention.findMany({
            where: {
                commentId,
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
            orderBy: {
                createdAt: "asc",
            },
        });
    },

    deleteByCommentId(
        commentId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.mention.deleteMany({
            where: {
                commentId,
            },
        });
    },
};
