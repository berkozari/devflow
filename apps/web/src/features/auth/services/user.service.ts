import { apiClient } from "@/services/api";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
}

interface GetMeResponse {
    success: boolean;
    data: AuthUser;
}

export const userService = {
    async getMe(): Promise<AuthUser> {
        const response = await apiClient.get<GetMeResponse>(
            "/users/me",
        );

        return response.data.data;
    },
};