import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
    userFind: vi.fn(), userCreate: vi.fn(), tokenFind: vi.fn(),
    tokenCreate: vi.fn(), tokenUpdateMany: vi.fn(), transaction: vi.fn(),
    txFind: vi.fn(), txCreate: vi.fn(), txUpdateMany: vi.fn(), txUpdate: vi.fn(),
}));
vi.mock("../../../src/config/database.js", () => ({
    prisma: {
        user: { findUnique: m.userFind, create: m.userCreate },
        refreshToken: {
            findUnique: m.tokenFind,
            create: m.tokenCreate,
            updateMany: m.tokenUpdateMany,
        },
        $transaction: m.transaction,
    },
}));
import { userRepository } from "../../../src/repositories/user.repository.js";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const TOKEN_ID = "00000000-0000-4000-8000-000000000002";
const NEW_TOKEN_ID = "00000000-0000-4000-8000-000000000003";
const FAMILY_ID = "00000000-0000-4000-8000-000000000004";
const mockUser = {
    id: USER_ID, name: "Test User", email: "test@example.com",
    passwordHash: "hashed-password", role: "USER" as const,
};
const mockToken = {
    id: TOKEN_ID, userId: USER_ID, familyId: FAMILY_ID,
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    usedAt: null, revokedAt: null,
    user: { id: USER_ID, name: mockUser.name, email: mockUser.email, role: mockUser.role },
};
const replacementInput = {
    oldTokenId: TOKEN_ID, tokenHash: "new-token-hash",
    userId: USER_ID, familyId: FAMILY_ID,
    expiresAt: new Date("2030-02-01T00:00:00.000Z"),
};
const tx = {
    refreshToken: {
        findUnique: m.txFind, create: m.txCreate,
        updateMany: m.txUpdateMany, update: m.txUpdate,
    },
};

describe("User Repository", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        m.transaction.mockImplementation(async (callback) => callback(tx));
    });

    it("findByEmail finds user by email", async () => {
        m.userFind.mockResolvedValue(mockUser);
        expect(await userRepository.findByEmail(mockUser.email)).toEqual(mockUser);
        expect(m.userFind).toHaveBeenCalledWith({ where: { email: mockUser.email } });
    });

    it("findByEmail returns null for missing user", async () => {
        m.userFind.mockResolvedValue(null);
        expect(await userRepository.findByEmail("missing@test.com")).toBeNull();
    });

    it("create selects public user fields only", async () => {
        const input = {
            name: mockUser.name, email: mockUser.email,
            passwordHash: mockUser.passwordHash,
        };
        const created = { id: USER_ID, name: input.name, email: input.email, createdAt: new Date() };
        m.userCreate.mockResolvedValue(created);
        expect(await userRepository.create(input)).toEqual(created);
        expect(m.userCreate).toHaveBeenCalledWith({
            data: input,
            select: { id: true, name: true, email: true, createdAt: true },
        });
    });

    it("createRefreshToken persists token family", async () => {
        m.tokenCreate.mockResolvedValue(mockToken);
        const input = {
            tokenHash: "hashed-refresh-token", userId: USER_ID,
            familyId: FAMILY_ID, expiresAt: mockToken.expiresAt,
        };
        expect(await userRepository.createRefreshToken(input)).toEqual(mockToken);
        expect(m.tokenCreate).toHaveBeenCalledWith({ data: input });
    });

    it("findRefreshToken selects only safe token and user fields", async () => {
        m.tokenFind.mockResolvedValue(mockToken);
        expect(await userRepository.findRefreshToken("hash")).toEqual(mockToken);
        expect(m.tokenFind).toHaveBeenCalledWith({
            where: { tokenHash: "hash" },
            select: {
                id: true, userId: true, familyId: true,
                expiresAt: true, revokedAt: true, usedAt: true,
                user: { select: { id: true, name: true, email: true, role: true } },
            },
        });
    });

    it("findRefreshToken returns null when no token exists", async () => {
        m.tokenFind.mockResolvedValue(null);
        expect(await userRepository.findRefreshToken("missing")).toBeNull();
    });

    it("consumeAndRotateRefreshToken atomically consumes and links replacement", async () => {
        m.txUpdateMany.mockResolvedValue({ count: 1 });
        m.txCreate.mockResolvedValue({ id: NEW_TOKEN_ID });
        expect(await userRepository.consumeAndRotateRefreshToken(replacementInput))
            .toEqual({ status: "ROTATED" });
        expect(m.transaction).toHaveBeenCalledOnce();
        expect(m.txUpdateMany).toHaveBeenCalledWith({
            where: {
                id: TOKEN_ID, usedAt: null, revokedAt: null,
                expiresAt: { gt: expect.any(Date) },
            },
            data: { usedAt: expect.any(Date) },
        });
        expect(m.txCreate).toHaveBeenCalledWith({
            data: {
                tokenHash: replacementInput.tokenHash,
                userId: USER_ID, familyId: FAMILY_ID,
                expiresAt: replacementInput.expiresAt,
            },
        });
        expect(m.txUpdate).toHaveBeenCalledWith({
            where: { id: TOKEN_ID },
            data: { replacedByTokenId: NEW_TOKEN_ID },
        });
    });

    it("returns INVALID when the old token is missing", async () => {
        m.txUpdateMany.mockResolvedValue({ count: 0 });
        m.txFind.mockResolvedValue(null);
        expect(await userRepository.consumeAndRotateRefreshToken(replacementInput))
            .toEqual({ status: "INVALID" });
        expect(m.txCreate).not.toHaveBeenCalled();
        expect(m.txUpdate).not.toHaveBeenCalled();
    });

    it("revokes all family tokens when a used token is reused", async () => {
        m.txUpdateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 2 });
        m.txFind.mockResolvedValue({ familyId: FAMILY_ID, usedAt: new Date() });
        expect(await userRepository.consumeAndRotateRefreshToken(replacementInput))
            .toEqual({ status: "REUSE" });
        expect(m.txUpdateMany).toHaveBeenCalledTimes(2);
        expect(m.txUpdateMany).toHaveBeenNthCalledWith(2, {
            where: { familyId: FAMILY_ID, revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
        expect(m.txCreate).not.toHaveBeenCalled();
        expect(m.txUpdate).not.toHaveBeenCalled();
    });

    it("returns INVALID for an unconsumed token that cannot rotate", async () => {
        m.txUpdateMany.mockResolvedValue({ count: 0 });
        m.txFind.mockResolvedValue({ familyId: FAMILY_ID, usedAt: null });
        expect(await userRepository.consumeAndRotateRefreshToken(replacementInput))
            .toEqual({ status: "INVALID" });
        expect(m.txUpdateMany).toHaveBeenCalledTimes(1);
        expect(m.txCreate).not.toHaveBeenCalled();
    });

    it("revokeTokenFamily revokes only active family tokens", async () => {
        m.tokenUpdateMany.mockResolvedValue({ count: 2 });
        expect(await userRepository.revokeTokenFamily(FAMILY_ID)).toEqual({ count: 2 });
        expect(m.tokenUpdateMany).toHaveBeenCalledWith({
            where: { familyId: FAMILY_ID, revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
    });

    it("revokeUserSessions revokes only active user tokens", async () => {
        m.tokenUpdateMany.mockResolvedValue({ count: 3 });
        expect(await userRepository.revokeUserSessions(USER_ID)).toEqual({ count: 3 });
        expect(m.tokenUpdateMany).toHaveBeenCalledWith({
            where: { userId: USER_ID, revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
    });
});
