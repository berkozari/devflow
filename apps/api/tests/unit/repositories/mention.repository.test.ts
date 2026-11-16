import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    createMany,
    createManyAndReturn,
    findMany,
    deleteMany,
} = vi.hoisted(() => ({
    createMany: vi.fn(),
    createManyAndReturn: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
}));

vi.mock("../../../src/config/database.js", () => ({
    prisma: {
        mention: { createMany, findMany, deleteMany },
    },
}));

import { mentionRepository } from "../../../src/repositories/mention.repository.js";

const COMMENT_ID = "00000000-0000-4000-8000-000000000003";
const USER_A = "00000000-0000-4000-8000-000000000004";
const USER_B = "00000000-0000-4000-8000-000000000005";

// Transaction-client mock: tests must prove calls use tx, not global prisma.
const txCreateMany = vi.fn();
const txCreateManyAndReturn = vi.fn();
const txFindMany = vi.fn();
const txDeleteMany = vi.fn();
const tx = {
    mention: {
        createMany: txCreateMany,
        createManyAndReturn: txCreateManyAndReturn,
        findMany: txFindMany,
        deleteMany: txDeleteMany,
    },
};

describe("Mention Repository", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createMany", () => {
        it("deduplicates IDs and requests skipDuplicates on the default client", async () => {
            createMany.mockResolvedValue({ count: 2 });

            const result = await mentionRepository.createMany(
                COMMENT_ID,
                [USER_A, USER_A, USER_B],
            );

            expect(result).toEqual({ count: 2 });
            expect(createMany).toHaveBeenCalledWith({
                data: [
                    { commentId: COMMENT_ID, userId: USER_A },
                    { commentId: COMMENT_ID, userId: USER_B },
                ],
                skipDuplicates: true,
            });
        });

        it("uses the supplied transaction instead of global prisma", async () => {
            txCreateMany.mockResolvedValue({ count: 1 });

            await mentionRepository.createMany(COMMENT_ID, [USER_A], tx as never);

            expect(txCreateMany).toHaveBeenCalledOnce();
            expect(createMany).not.toHaveBeenCalled();
        });

        it("passes an empty array through without inventing data", async () => {
            createMany.mockResolvedValue({ count: 0 });
            await mentionRepository.createMany(COMMENT_ID, []);
            expect(createMany).toHaveBeenCalledWith({
                data: [],
                skipDuplicates: true,
            });
        });
    });

    describe("createManyReturningNew", () => {
        it("returns only newly inserted mention user IDs", async () => {
            txCreateManyAndReturn.mockResolvedValue([{ userId: USER_A }]);

            const result = await mentionRepository.createManyReturningNew(
                COMMENT_ID,
                [USER_A, USER_B],
                tx as never,
            );

            expect(result).toEqual([{ userId: USER_A }]);
            expect(txCreateManyAndReturn).toHaveBeenCalledWith({
                data: [
                    { commentId: COMMENT_ID, userId: USER_A },
                    { commentId: COMMENT_ID, userId: USER_B },
                ],
                skipDuplicates: true,
                select: { userId: true },
            });
            expect(createMany).not.toHaveBeenCalled();
        });
    });

    describe("findByCommentId", () => {
        const expectedQuery = {
            where: { commentId: COMMENT_ID },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: [
                { createdAt: "asc" },
                { id: "asc" },
            ],
        };

        it("selects safe user fields and orders mentions deterministically", async () => {
            findMany.mockResolvedValue([{ id: "mention-1" }]);
            const result = await mentionRepository.findByCommentId(COMMENT_ID);
            expect(result).toEqual([{ id: "mention-1" }]);
            expect(findMany).toHaveBeenCalledWith(expectedQuery);
        });

        it("uses the transaction client when supplied", async () => {
            txFindMany.mockResolvedValue([]);
            await mentionRepository.findByCommentId(COMMENT_ID, tx as never);
            expect(txFindMany).toHaveBeenCalledWith(expectedQuery);
            expect(findMany).not.toHaveBeenCalled();
        });
    });

    describe("deleteByCommentId", () => {
        it("deletes mentions only for the provided comment", async () => {
            deleteMany.mockResolvedValue({ count: 2 });
            const result = await mentionRepository.deleteByCommentId(COMMENT_ID);
            expect(result).toEqual({ count: 2 });
            expect(deleteMany).toHaveBeenCalledWith({
                where: { commentId: COMMENT_ID },
            });
        });

        it("uses the transaction client when supplied", async () => {
            txDeleteMany.mockResolvedValue({ count: 0 });
            await mentionRepository.deleteByCommentId(COMMENT_ID, tx as never);
            expect(txDeleteMany).toHaveBeenCalledWith({
                where: { commentId: COMMENT_ID },
            });
            expect(deleteMany).not.toHaveBeenCalled();
        });
    });
});
