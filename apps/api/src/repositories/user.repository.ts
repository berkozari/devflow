
import { prisma } from "../config/database.js";

type CreateRefreshTokenInput = {
    tokenHash: string;
    userId: string;
    familyId: string;
    expiresAt: Date;
};

type RotateRefreshTokenInput = CreateRefreshTokenInput & {
    oldTokenId: string;
};

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

    createRefreshToken(data: CreateRefreshTokenInput) {
        return prisma.refreshToken.create({ data });
    },

    findRefreshToken(tokenHash: string) {
        return prisma.refreshToken.findUnique({
            where: { tokenHash },
            select: {
                id: true,
                userId: true,
                familyId: true,
                expiresAt: true,
                revokedAt: true,
                usedAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    },

    async consumeAndRotateRefreshToken(
        data: RotateRefreshTokenInput,
    ) {
        return prisma.$transaction(async (tx) => {
            const now = new Date();

            // Atomically consume the old token.
            const consumed = await tx.refreshToken.updateMany({
                where: {
                    id: data.oldTokenId,
                    usedAt: null,
                    revokedAt: null,
                    expiresAt: {
                        gt: now,
                    },
                },
                data: {
                    usedAt: now,
                },
            });

            if (consumed.count !== 1) {
                const currentToken =
                    await tx.refreshToken.findUnique({
                        where: { id: data.oldTokenId },
                        select: {
                            familyId: true,
                            usedAt: true,
                        },
                    });

                if (!currentToken) {
                    return { status: "INVALID" as const };
                }

                // Previously consumed token: possible reuse.
                if (currentToken.usedAt) {
                    await tx.refreshToken.updateMany({
                        where: {
                            familyId: currentToken.familyId,
                            revokedAt: null,
                        },
                        data: {
                            revokedAt: now,
                        },
                    });

                    return { status: "REUSE" as const };
                }

                return { status: "INVALID" as const };
            }

            // Create replacement token.
            const replacement = await tx.refreshToken.create({
                data: {
                    tokenHash: data.tokenHash,
                    userId: data.userId,
                    familyId: data.familyId,
                    expiresAt: data.expiresAt,
                },
            });

            // Connect the rotation chain.
            await tx.refreshToken.update({
                where: {
                    id: data.oldTokenId,
                },
                data: {
                    replacedByTokenId: replacement.id,
                },
            });

            return { status: "ROTATED" as const };
        });
    },

    revokeTokenFamily(familyId: string) {
        return prisma.refreshToken.updateMany({
            where: {
                familyId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    },

    revokeUserSessions(userId: string) {
        return prisma.refreshToken.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    },
};
