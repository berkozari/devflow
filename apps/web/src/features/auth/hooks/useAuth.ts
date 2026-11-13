
import { useEffect } from "react";

import { useCurrentUser } from "./useCurrentUser";
import { useAuthStore } from "@/stores";

import { ApiError } from "@/utils/api-error";

export function useAuth() {
    const setUser = useAuthStore(
        (state) => state.setUser,
    );

    const clearAuth = useAuthStore(
        (state) => state.clearAuth,
    );

    const query = useCurrentUser();

    useEffect(() => {
        if (query.data) {
            setUser(query.data);
        }
    }, [query.data, setUser]);

    useEffect(() => {
        if (
            query.isError &&
            query.error instanceof ApiError &&
            query.error.status === 401
        ) {
            clearAuth();
        }
    }, [query.isError, query.error, clearAuth]);

    return {
        user: query.data ?? null,
        isLoading: query.isPending,
        isAuthenticated: !!query.data,
        isError: query.isError,
        error: query.error,
    };
}
