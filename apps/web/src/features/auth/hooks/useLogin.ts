
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authService } from "../services/auth.service";
import { useAuthStore } from "@/stores";
import { authKeys } from "./useCurrentUser";

export function useLogin() {
    const queryClient = useQueryClient();

    const setAuth = useAuthStore((state) => state.setAuth);

    return useMutation({
        mutationFn: authService.login,

        onSuccess: (data) => {
            setAuth(data.accessToken, data.user);

            queryClient.setQueryData(
                authKeys.currentUser(),
                data.user,
            );

            queryClient.invalidateQueries({
                queryKey: ["auth"],
            });
        },
    });
}
