
import { prisma } from "../config/database.js";

import type { Prisma } from "../generated/prisma/client.js";

import type {
    CreateCommentInput,
    UpdateCommentInput,
    CommentQuery,
} from "../schemas/comment.schema.js";

const commentInclude = {
    author: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    mentions: {
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
} satisfies Prisma.CommentInclude;

export const commentRepository = {
    create(
        taskId: string,
        authorId: string,
        data: CreateCommentInput,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.comment.create({
            data: {
                content: data.content,
                taskId,
                authorId,

                mentions: {
                    create: [
                        ...new Set(data.mentionedUserIds ?? []),
                    ].map((userId) => ({
                        userId,
                    })),
                },
            },
            include: commentInclude,
        });
    },

    findById(
        taskId: string,
        commentId: string,
    ) {
        return prisma.comment.findFirst({
            where: {
                id: commentId,
                taskId,
            },
            include: commentInclude,
        });
    },

    findMany(
        taskId: string,
        query: CommentQuery,
    ) {
        const { page, limit } = query;

        const where = {
            taskId,
        };

        return prisma.$transaction([
            prisma.comment.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {
                    createdAt: "asc",
                },
                include: commentInclude,
            }),

            prisma.comment.count({
                where,
            }),
        ]);
    },

    update(
        taskId: string,
        commentId: string,
        data: UpdateCommentInput,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.comment.updateMany({
            where: {
                id: commentId,
                taskId,
            },
            data: {
                content: data.content,
            },
        });
    },

    delete(
        taskId: string,
        commentId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.comment.deleteMany({
            where: {
                id: commentId,
                taskId,
            },
        });
    },
};
