
import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/utils/api-error";

function shouldRetryQuery(
    failureCount: number,
    error: Error,
): boolean {
    if (failureCount >= 1) {
        return false;
    }

    if (!(error instanceof ApiError)) {
        return false;
    }

    if (error.status !== undefined) {
        return (
            error.status === 408 ||
            error.status >= 500
        );
    }

    return (
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT"
    );
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: shouldRetryQuery,
            refetchOnWindowFocus: false,
        },

        mutations: {
            retry: 0,
        },
    },
});
