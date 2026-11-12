import { beforeEach, describe, expect, it, vi } from "vitest";

import { authService } from "../../../src/services/auth.service.js";
import { userRepository } from "../../../src/repositories/user.repository.js";
import { tokenService } from "../../../src/services/token.service.js";
import { AppError } from "../../../src/utils/app-error.js";

import argon2 from "argon2";

import type { RegisterInput, LoginInput, } from "../../../src/schemas/auth.schema.js";

vi.mock("argon2", () => ({
    default: {
        hash: vi.fn(),
        verify: vi.fn(),
        argon2id: 2,
    },
}));

vi.mock("../../../src/repositories/user.repository.js", () => ({
    userRepository: {
        findByEmail: vi.fn(),
        create: vi.fn(),
        createRefreshToken: vi.fn(),
        findRefreshToken: vi.fn(),
        deleteRefreshToken: vi.fn(),
        rotateRefreshToken: vi.fn(),
    },
}));

vi.mock("../../../src/services/token.service.js", () => ({
    tokenService: {
        generateAccessToken: vi.fn(),
        generateRefreshToken: vi.fn(),
        hashRefreshToken: vi.fn(),
        getRefreshTokenExpiry: vi.fn(),
    },
}));

const mockedRepository = vi.mocked(userRepository);
const mockedTokenService = vi.mocked(tokenService);
const mockedArgon2 = vi.mocked(argon2);

const USER_ID = "user-uuid";
const TOKEN_ID = "refresh-token-uuid";

const ACCESS_TOKEN = "mock-access-token";
const REFRESH_TOKEN = "mock-refresh-token";
const NEW_REFRESH_TOKEN = "new-refresh-token";
const TOKEN_HASH = "mock-token-hash";
const NEW_TOKEN_HASH = "new-token-hash"; const PASSWORD_HASH = "mock-password-hash";

const mockUser = { id: USER_ID, name: "Test User", email: "test@example.com", passwordHash: PASSWORD_HASH, role: "USER" as const, };

const mockStoredToken = { id: TOKEN_ID, tokenHash: TOKEN_HASH, userId: USER_ID, expiresAt: new Date("2030-01-01T00:00:00.000Z"), user: mockUser, };

const registerInput: RegisterInput = { name: "Test User", email: "test@example.com", password: "password123", };

const loginInput: LoginInput = { email: "test@example.com", password: "password123", };

const mockExpiry = new Date("2030-01-01T00:00:00.000Z");

describe("Auth Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockedTokenService.generateAccessToken.mockReturnValue(
            ACCESS_TOKEN,
        );

        mockedTokenService.generateRefreshToken.mockReturnValue(
            REFRESH_TOKEN,
        );

        mockedTokenService.getRefreshTokenExpiry.mockReturnValue(
            mockExpiry,
        );

        mockedArgon2.hash.mockResolvedValue(PASSWORD_HASH);
        mockedArgon2.verify.mockResolvedValue(true);
    });

    describe("register", () => {
        it("should register a user successfully", async () => {
            const createdUser = {
                id: USER_ID,
                name: registerInput.name,
                email: registerInput.email,
                createdAt: new Date(),
            };

            mockedRepository.findByEmail.mockResolvedValue(null as never);
            mockedRepository.create.mockResolvedValue(createdUser as never);

            const result = await authService.register(registerInput);

            expect(result).toEqual(createdUser);

            expect(mockedRepository.findByEmail).toHaveBeenCalledWith(
                registerInput.email,
            );

            expect(mockedArgon2.hash).toHaveBeenCalledWith(
                registerInput.password,
                expect.objectContaining({
                    type: expect.any(Number),
                }),
            );

            expect(mockedRepository.create).toHaveBeenCalledWith({
                name: registerInput.name,
                email: registerInput.email,
                passwordHash: PASSWORD_HASH,
            });
        });

        it("should throw 409 when email is already registered", async () => {
            mockedRepository.findByEmail.mockResolvedValue(
                mockUser as never,
            );

            await expect(
                authService.register(registerInput),
            ).rejects.toMatchObject({
                statusCode: 409,
                message: "Email is already registered",
            });

            expect(mockedArgon2.hash).not.toHaveBeenCalled();
            expect(mockedRepository.create).not.toHaveBeenCalled();
        });
    });

    describe("login", () => {
        it("should login successfully", async () => {
            mockedTokenService.hashRefreshToken.mockReturnValue(TOKEN_HASH);

            mockedRepository.findByEmail.mockResolvedValue(
                mockUser as never,
            );

            mockedRepository.createRefreshToken.mockResolvedValue(
                {} as never,
            );

            const result = await authService.login(loginInput);

            expect(result).toEqual({
                accessToken: ACCESS_TOKEN,
                refreshToken: REFRESH_TOKEN,
                user: {
                    id: USER_ID,
                    name: mockUser.name,
                    email: mockUser.email,
                },
            });

            expect(mockedArgon2.verify).toHaveBeenCalledWith(
                PASSWORD_HASH,
                loginInput.password,
            );

            expect(
                mockedTokenService.generateAccessToken,
            ).toHaveBeenCalledWith(mockUser);

            expect(
                mockedRepository.createRefreshToken,
            ).toHaveBeenCalledWith({
                tokenHash: TOKEN_HASH,
                userId: USER_ID,
                expiresAt: mockExpiry,
            });
        });

        it("should throw 401 when user does not exist", async () => {
            mockedRepository.findByEmail.mockResolvedValue(null as never);

            await expect(
                authService.login(loginInput),
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Invalid email or password",
            });

            expect(mockedArgon2.verify).not.toHaveBeenCalled();
        });

        it("should throw 401 when password is incorrect", async () => {
            mockedRepository.findByEmail.mockResolvedValue(
                mockUser as never,
            );

            mockedArgon2.verify.mockResolvedValue(false);

            await expect(
                authService.login(loginInput),
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Invalid email or password",
            });

            expect(
                mockedRepository.createRefreshToken,
            ).not.toHaveBeenCalled();
        });
    });

    describe("refresh", () => {
        it("should refresh tokens successfully", async () => {
            mockedRepository.findRefreshToken.mockResolvedValue(
                mockStoredToken as never,
            );

            mockedTokenService.generateRefreshToken.mockReturnValue(
                NEW_REFRESH_TOKEN,
            );

            mockedTokenService.hashRefreshToken
                .mockReturnValueOnce(TOKEN_HASH)
                .mockReturnValueOnce(NEW_TOKEN_HASH);

            mockedRepository.rotateRefreshToken.mockResolvedValue(
                true as never,
            );

            const result = await authService.refresh(REFRESH_TOKEN);

            expect(result).toEqual({
                accessToken: ACCESS_TOKEN,
                refreshToken: NEW_REFRESH_TOKEN,
                user: {
                    id: USER_ID,
                    name: mockUser.name,
                    email: mockUser.email,
                },
            });

            expect(
                mockedRepository.findRefreshToken,
            ).toHaveBeenCalledWith(TOKEN_HASH);

            expect(
                mockedRepository.rotateRefreshToken,
            ).toHaveBeenCalledWith(TOKEN_ID, {
                tokenHash: NEW_TOKEN_HASH,
                userId: USER_ID,
                expiresAt: mockExpiry,
            });
        });

        it("should throw 401 when refresh token does not exist", async () => {
            mockedRepository.findRefreshToken.mockResolvedValue(
                null as never,
            );

            await expect(
                authService.refresh(REFRESH_TOKEN),
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Invalid or expired refresh token",
            });
        });

        it("should throw 401 when refresh token is expired", async () => {
            const expiredToken = {
                ...mockStoredToken,
                expiresAt: new Date("2020-01-01T00:00:00.000Z"),
            };

            mockedRepository.findRefreshToken.mockResolvedValue(
                expiredToken as never,
            );

            await expect(
                authService.refresh(REFRESH_TOKEN),
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Invalid or expired refresh token",
            });

            expect(
                mockedRepository.rotateRefreshToken,
            ).not.toHaveBeenCalled();
        });

        it("should throw 401 when token rotation fails", async () => {
            mockedRepository.findRefreshToken.mockResolvedValue(
                mockStoredToken as never,
            );

            mockedRepository.rotateRefreshToken.mockResolvedValue(
                false as never,
            );

            await expect(
                authService.refresh(REFRESH_TOKEN),
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Refresh token is no longer valid",
            });
        });
    });

    describe("logout", () => {
        it("should delete refresh token successfully", async () => {
            mockedTokenService.hashRefreshToken.mockReturnValue(TOKEN_HASH);

            mockedRepository.findRefreshToken.mockResolvedValue(
                mockStoredToken as never,
            );

            mockedRepository.deleteRefreshToken.mockResolvedValue(
                {} as never,
            );

            await expect(
                authService.logout(REFRESH_TOKEN),
            ).resolves.toBeUndefined();

            expect(
                mockedRepository.findRefreshToken,
            ).toHaveBeenCalledWith(TOKEN_HASH);

            expect(
                mockedRepository.deleteRefreshToken,
            ).toHaveBeenCalledWith(TOKEN_ID);
        });

        it("should do nothing when refresh token is not provided", async () => {
            await expect(
                authService.logout(),
            ).resolves.toBeUndefined();

            expect(
                mockedRepository.findRefreshToken,
            ).not.toHaveBeenCalled();

            expect(
                mockedRepository.deleteRefreshToken,
            ).not.toHaveBeenCalled();
        });

        it("should not delete anything when token does not exist", async () => {
            mockedRepository.findRefreshToken.mockResolvedValue(
                null as never,
            );

            await expect(
                authService.logout(REFRESH_TOKEN),
            ).resolves.toBeUndefined();

            expect(
                mockedRepository.deleteRefreshToken,
            ).not.toHaveBeenCalled();
        });
    });


});