
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const {
    findUnique,
    create,
    createRefreshToken,
    deleteRefreshToken,
    deleteMany,
    transactionCreate,
    transaction,
} = vi.hoisted(() => ({
    findUnique: vi.fn(),
    create: vi.fn(),
    createRefreshToken: vi.fn(),
    deleteRefreshToken: vi.fn(),
    deleteMany: vi.fn(),
    transactionCreate: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock("../../../src/config/database.js", () => ({
    prisma: {
        user: {
            findUnique,
            create,
        },
        refreshToken: {
            create: createRefreshToken,
            findUnique,
            delete: deleteRefreshToken,
        },
        $transaction: transaction,
    },
}));

import { userRepository } from "../../../src/repositories/user.repository.js";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const TOKEN_ID = "00000000-0000-4000-8000-000000000002";

const mockUser = {
    id: USER_ID,
    name: "Test User",
    email: "test@example.com",
    passwordHash: "hashed-password",
    role: "USER",
};

const mockToken = {
    id: TOKEN_ID,
    tokenHash: "hashed-refresh-token",
    userId: USER_ID,
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    user: mockUser,
};

describe("User Repository", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        transaction.mockImplementation(async (callback) => {
            return callback({
                refreshToken: {
                    deleteMany,
                    create: transactionCreate,
                },
            });
        });
    });

    describe("findByEmail", () => {
        it("should find user by email", async () => {
            findUnique.mockResolvedValue(mockUser);

            const result = await userRepository.findByEmail(
                mockUser.email,
            );

            expect(result).toEqual(mockUser);

            expect(findUnique).toHaveBeenCalledWith({
                where: {
                    email: mockUser.email,
                },
            });
        });

        it("should return null when user does not exist", async () => {
            findUnique.mockResolvedValue(null);

            const result = await userRepository.findByEmail(
                "unknown@example.com",
            );

            expect(result).toBeNull();
        });
    });

    describe("create", () => {
        it("should create a user with selected fields", async () => {
            const input = {
                name: mockUser.name,
                email: mockUser.email,
                passwordHash: mockUser.passwordHash,
            };

            const createdUser = {
                id: USER_ID,
                name: input.name,
                email: input.email,
                createdAt: new Date(),
            };

            create.mockResolvedValue(createdUser);

            const result = await userRepository.create(input);

            expect(result).toEqual(createdUser);

            expect(create).toHaveBeenCalledWith({
                data: input,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                },
            });
        });
    });

    describe("createRefreshToken", () => {
        it("should create a refresh token", async () => {
            const input = {
                tokenHash: "hashed-refresh-token",
                userId: USER_ID,
                expiresAt: mockToken.expiresAt,
            };

            createRefreshToken.mockResolvedValue(mockToken);

            const result = await userRepository.createRefreshToken(
                input,
            );

            expect(result).toEqual(mockToken);

            expect(createRefreshToken).toHaveBeenCalledWith({
                data: input,
            });
        });
    });

    describe("findRefreshToken", () => {
        it("should find refresh token with user", async () => {
            findUnique.mockResolvedValue(mockToken);

            const result = await userRepository.findRefreshToken(
                mockToken.tokenHash,
            );

            expect(result).toEqual(mockToken);

            expect(findUnique).toHaveBeenCalledWith({
                where: {
                    tokenHash: mockToken.tokenHash,
                },
                include: {
                    user: true,
                },
            });
        });

        it("should return null when token does not exist", async () => {
            findUnique.mockResolvedValue(null);

            const result = await userRepository.findRefreshToken(
                "unknown-token",
            );

            expect(result).toBeNull();
        });
    });

    describe("deleteRefreshToken", () => {
        it("should delete refresh token by ID", async () => {
            deleteRefreshToken.mockResolvedValue(mockToken);

            const result = await userRepository.deleteRefreshToken(
                TOKEN_ID,
            );

            expect(result).toEqual(mockToken);

            expect(deleteRefreshToken).toHaveBeenCalledWith({
                where: {
                    id: TOKEN_ID,
                },
            });
        });
    });

    describe("rotateRefreshToken", () => {
        const newToken = {
            tokenHash: "new-token-hash",
            userId: USER_ID,
            expiresAt: new Date("2030-02-01T00:00:00.000Z"),
        };

        it("should rotate refresh token successfully", async () => {
            deleteMany.mockResolvedValue({
                count: 1,
            });

            transactionCreate.mockResolvedValue(newToken);

            const result = await userRepository.rotateRefreshToken(
                TOKEN_ID,
                newToken,
            );

            expect(result).toBe(true);

            expect(transaction).toHaveBeenCalledTimes(1);

            expect(deleteMany).toHaveBeenCalledWith({
                where: {
                    id: TOKEN_ID,
                },
            });

            expect(transactionCreate).toHaveBeenCalledWith({
                data: newToken,
            });
        });

        it("should return false when old token does not exist", async () => {
            deleteMany.mockResolvedValue({
                count: 0,
            });

            const result = await userRepository.rotateRefreshToken(
                TOKEN_ID,
                newToken,
            );

            expect(result).toBe(false);

            expect(transactionCreate).not.toHaveBeenCalled();
        });
    });
});
