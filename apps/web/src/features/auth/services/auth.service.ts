
import { apiClient } from "@/services/api";
import type { AuthUser } from "../types/auth.types";

interface AuthResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

interface AuthTokenData {
    accessToken: string;
    user: AuthUser;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
}

export const authService = {
    async login(payload: LoginPayload) {
        const response = await apiClient.post<
            AuthResponse<AuthTokenData>
        >("/auth/login", payload);

        return response.data.data;
    },

    async register(payload: RegisterPayload) {
        const response = await apiClient.post<
            AuthResponse<AuthUser>
        >("/auth/register", payload);

        return response.data.data;
    },

    async logout() {
        await apiClient.post("/auth/logout");
    },
};
