
import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";

import { tokenService } from "../../../src/services/token.service.js";
import { env } from "../../../src/config/env.js";

import type { Role } from "../../../src/generated/prisma/client.js";

const mockUser = {
    id: "user-uuid",
    email: "test@example.com",
    role: "USER" as Role,
};

describe("Token Service", () => {
    describe("generateAccessToken", () => {
        it("should generate a valid JWT access token", () => {
            const token = tokenService.generateAccessToken(mockUser);

            expect(token).toBeTypeOf("string");

            const decoded = jwt.verify(token, env.jwtSecret, {
                issuer: "devflow-api",
                audience: "devflow-web",
            }) as jwt.JwtPayload;

            expect(decoded.sub).toBe(mockUser.id);
            expect(decoded.email).toBe(mockUser.email);
            expect(decoded.role).toBe(mockUser.role);
        });

        it("should include the configured expiration", () => {
            const token = tokenService.generateAccessToken(mockUser);

            const decoded = jwt.decode(token) as jwt.JwtPayload;

            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp! - decoded.iat!).toBe(15 * 60);
        });

        it("should include the correct issuer and audience", () => {
            const token = tokenService.generateAccessToken(mockUser);

            const decoded = jwt.decode(token) as jwt.JwtPayload;

            expect(decoded.iss).toBe("devflow-api");
            expect(decoded.aud).toBe("devflow-web");
        });
    });

    describe("generateRefreshToken", () => {
        it("should generate a string refresh token", () => {
            const token = tokenService.generateRefreshToken();

            expect(token).toBeTypeOf("string");
        });

        it("should generate a 96-character hexadecimal token", () => {
            const token = tokenService.generateRefreshToken();

            expect(token).toMatch(/^[a-f0-9]{96}$/);
        });

        it("should generate unique tokens", () => {
            const firstToken = tokenService.generateRefreshToken();
            const secondToken = tokenService.generateRefreshToken();

            expect(firstToken).not.toBe(secondToken);
        });
    });

    describe("hashRefreshToken", () => {
        it("should generate a SHA-256 hash", () => {
            const token = "mock-refresh-token";

            const result = tokenService.hashRefreshToken(token);

            const expectedHash = createHash("sha256")
                .update(token)
                .digest("hex");

            expect(result).toBe(expectedHash);
        });

        it("should generate a 64-character hexadecimal hash", () => {
            const result = tokenService.hashRefreshToken(
                "mock-refresh-token",
            );

            expect(result).toMatch(/^[a-f0-9]{64}$/);
        });

        it("should generate the same hash for the same token", () => {
            const token = "mock-refresh-token";

            expect(tokenService.hashRefreshToken(token)).toBe(
                tokenService.hashRefreshToken(token),
            );
        });
    });

    describe("getRefreshTokenExpiry", () => {
        it("should return a date", () => {
            const result = tokenService.getRefreshTokenExpiry();

            expect(result).toBeInstanceOf(Date);
        });

        it("should set expiration to configured days", () => {
            const before = Date.now();

            const result = tokenService.getRefreshTokenExpiry();

            const after = Date.now();

            const expectedDays = env.refreshTokenExpiresInDays;
            const expectedDuration = expectedDays * 24 * 60 * 60 * 1000;

            expect(result.getTime()).toBeGreaterThanOrEqual(
                before + expectedDuration,
            );

            expect(result.getTime()).toBeLessThanOrEqual(
                after + expectedDuration,
            );
        });
    });

    describe("verifyAccessToken", () => {
        it("should verify a valid access token", () => {
            const token = tokenService.generateAccessToken(mockUser);

            const result = tokenService.verifyAccessToken(token);

            expect(result).toMatchObject({
                sub: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
                iss: "devflow-api",
                aud: "devflow-web",
            });
        });

        it("should throw when token is invalid", () => {
            expect(() => {
                tokenService.verifyAccessToken("invalid-token");
            }).toThrow();
        });

        it("should throw when token is signed with another secret", () => {
            const token = jwt.sign(
                { email: mockUser.email, role: mockUser.role },
                "another-secret-that-is-at-least-32-characters-long",
                {
                    subject: mockUser.id,
                    issuer: "devflow-api",
                    audience: "devflow-web",
                },
            );

            expect(() => {
                tokenService.verifyAccessToken(token);
            }).toThrow();
        });

        it("should throw when issuer is incorrect", () => {
            const token = jwt.sign(
                { email: mockUser.email, role: mockUser.role },
                env.jwtSecret,
                {
                    subject: mockUser.id,
                    issuer: "wrong-issuer",
                    audience: "devflow-web",
                },
            );

            expect(() => {
                tokenService.verifyAccessToken(token);
            }).toThrow();
        });

        it("should throw when audience is incorrect", () => {
            const token = jwt.sign(
                { email: mockUser.email, role: mockUser.role },
                env.jwtSecret,
                {
                    subject: mockUser.id,
                    issuer: "devflow-api",
                    audience: "wrong-audience",
                },
            );

            expect(() => {
                tokenService.verifyAccessToken(token);
            }).toThrow();
        });
    });
});
