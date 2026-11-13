
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authService } from "../services/auth.service";
import { useAuthStore } from "@/stores";

export function useLogout() {
    const queryClient = useQueryClient();

    const clearAuth = useAuthStore((state) => state.clearAuth);

    return useMutation({
        mutationFn: () => authService.logout(),

        onSettled: () => {
            clearAuth();

            queryClient.clear();
        },
    });
}
