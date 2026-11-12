
import { prisma } from "../config/database.js";

export const userRepository = {
    findByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
        });
    },

    create(data: {
        name: string;
        email: string;
        passwordHash: string;
    }) {
        return prisma.user.create({
            data,
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });
    },

    createRefreshToken(data: {
        tokenHash: string;
        userId: string;
        expiresAt: Date;
    }) {
        return prisma.refreshToken.create({ data });
    },

    findRefreshToken(tokenHash: string) {
        return prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
    },

    deleteRefreshToken(id: string) {
        return prisma.refreshToken.delete({
            where: { id },
        });
    },

    async rotateRefreshToken(
        oldTokenId: string,
        data: {
            tokenHash: string;
            userId: string;
            expiresAt: Date;
        },
    ) {
        return prisma.$transaction(async (tx) => {
            const deleted = await tx.refreshToken.deleteMany({
                where: { id: oldTokenId },
            });

            if (deleted.count !== 1) {
                return false;
            }

            await tx.refreshToken.create({ data });

            return true;
        });
    },

};
