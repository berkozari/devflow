
import type { Role } from "../../src/generated/prisma/client.js";
import { tokenService } from "../../src/services/token.service.js";

interface TestUser {
    id: string;
    email: string;
    role: Role;
}

export function createTestAccessToken(user: TestUser): string {
    return tokenService.generateAccessToken(user);
}

export function createAuthHeader(user: TestUser) {
    return {
        Authorization: `Bearer ${createTestAccessToken(user)}`,
    };
}
