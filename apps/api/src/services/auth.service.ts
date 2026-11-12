
import argon2 from "argon2";

import { AppError } from "../utils/app-error.js";
import { userRepository } from "../repositories/user.repository.js";
import { tokenService } from "./token.service.js";
import type {
    RegisterInput,
    LoginInput,
} from "../schemas/auth.schema.js";

export const authService = {
    async register(input: RegisterInput) {
        const existingUser = await userRepository.findByEmail(
            input.email,
        );

        if (existingUser) {
            throw new AppError("Email is already registered", 409);
        }

        const passwordHash = await argon2.hash(input.password, {
            type: argon2.argon2id,
        });

        return userRepository.create({
            name: input.name,
            email: input.email,
            passwordHash,
        });
    },

    async login(input: LoginInput) {
        const user = await userRepository.findByEmail(input.email);

        if (!user) {
            throw new AppError("Invalid email or password", 401);
        }

        const passwordMatches = await argon2.verify(
            user.passwordHash,
            input.password,
        );

        if (!passwordMatches) {
            throw new AppError("Invalid email or password", 401);
        }

        const accessToken = tokenService.generateAccessToken(user);

        const refreshToken = tokenService.generateRefreshToken();

        const tokenHash = tokenService.hashRefreshToken(refreshToken);

        await userRepository.createRefreshToken({
            tokenHash,
            userId: user.id,
            expiresAt: tokenService.getRefreshTokenExpiry(),
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        };
    },


    async refresh(rawToken: string) {
        const tokenHash = tokenService.hashRefreshToken(rawToken);

        const storedToken = await userRepository.findRefreshToken(tokenHash);

        if (!storedToken || storedToken.expiresAt <= new Date()) {
            throw new AppError("Invalid or expired refresh token", 401);
        }

        const newRefreshToken = tokenService.generateRefreshToken();

        const rotated = await userRepository.rotateRefreshToken(
            storedToken.id,
            {
                tokenHash: tokenService.hashRefreshToken(newRefreshToken),
                userId: storedToken.userId,
                expiresAt: tokenService.getRefreshTokenExpiry(),
            },
        );

        if (!rotated) {
            throw new AppError("Refresh token is no longer valid", 401);
        }

        return {
            accessToken: tokenService.generateAccessToken(storedToken.user),
            refreshToken: newRefreshToken,
            user: {
                id: storedToken.user.id,
                name: storedToken.user.name,
                email: storedToken.user.email,
            },
        };
    },

    async logout(rawToken?: string) {
        if (!rawToken) {
            return;
        }

        const tokenHash = tokenService.hashRefreshToken(rawToken);

        const storedToken = await userRepository.findRefreshToken(tokenHash);

        if (storedToken) {
            await userRepository.deleteRefreshToken(storedToken.id);
        }
    },

};
