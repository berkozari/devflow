
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/services/api";
import { userService } from "../services/user.service";
import { useAuthStore } from "@/stores";

interface RefreshResponse {
    success: boolean;
    message: string;
    data: {
        accessToken: string;
    };
}

export const authKeys = {
    all: ["auth"] as const,
    currentUser: () => [...authKeys.all, "current-user"] as const,
};

async function restoreSession() {
    const { accessToken, setAccessToken } =
        useAuthStore.getState();

    if (!accessToken) {
        const response = await apiClient.post<RefreshResponse>(
            "/auth/refresh",
        );

        setAccessToken(response.data.data.accessToken);
    }

    return userService.getMe();
}

export function useCurrentUser(enabled = true) {
    return useQuery({
        queryKey: authKeys.currentUser(),
        queryFn: restoreSession,
        enabled,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
}
