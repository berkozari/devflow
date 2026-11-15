
import axios, { AxiosHeaders } from "axios";

import { ApiError } from "@/utils/api-error";
import { useAuthStore } from "@/stores";

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
    throw new Error("VITE_API_BASE_URL is not configured");
}

interface RefreshResponse {
    success: boolean;
    message: string;
    data: {
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
        };
    };
}

interface CsrfResponse {
    success: boolean;
    message: string;
    data: {
        csrfToken: string;
    };
}

declare module "axios" {
    interface InternalAxiosRequestConfig {
        _retry?: boolean;
        _csrfRetry?: boolean;
    }
}

export const apiClient = axios.create({
    baseURL,
    timeout: 10_000,
    withCredentials: true,
    headers: {
        Accept: "application/json",
    },
});

let refreshPromise: Promise<string> | null = null;

let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

function isSafeMethod(method?: string) {
    return ["get", "head", "options"].includes(
        (method ?? "get").toLowerCase(),
    );
}

async function getCsrfToken(): Promise<string> {
    if (csrfToken) {
        return csrfToken;
    }

    if (!csrfPromise) {
        csrfPromise = apiClient
            .get<CsrfResponse>("/auth/csrf-token")
            .then((response) => {
                csrfToken = response.data.data.csrfToken;

                return csrfToken;
            })
            .finally(() => {
                csrfPromise = null;
            });
    }

    return csrfPromise;
}

// Attach authentication and CSRF headers.
apiClient.interceptors.request.use(async (config) => {
    config.headers = AxiosHeaders.from(config.headers);

    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
        config.headers.set(
            "Authorization",
            `Bearer ${accessToken}`,
        );
    }

    if (!isSafeMethod(config.method)) {
        const token = await getCsrfToken();

        config.headers.set("X-CSRF-Token", token);
    }

    return config;
});

async function refreshAccessToken(): Promise<string> {
    const response = await apiClient.post<RefreshResponse>(
        "/auth/refresh",
    );

    const newAccessToken = response.data.data.accessToken;

    useAuthStore.getState().setAccessToken(newAccessToken);

    return newAccessToken;
}

function normalizeApiError(error: unknown): unknown {
    if (!axios.isAxiosError(error)) {
        return error;
    }

    if (axios.isCancel(error)) {
        return error;
    }

    const status = error.response?.status;
    const data: unknown = error.response?.data;

    let message = "An unexpected API error occurred.";
    let validationErrors: unknown[] | undefined;

    if (
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT"
    ) {
        message = "The request timed out.";
    } else if (!error.response) {
        message = "Unable to connect to the server.";
    } else if (typeof data === "object" && data !== null) {
        if (
            "message" in data &&
            typeof data.message === "string"
        ) {
            message = data.message;
        }

        if (
            "errors" in data &&
            Array.isArray(data.errors)
        ) {
            validationErrors = data.errors;
        }
    }

    return new ApiError(
        message,
        status,
        error.code,
        validationErrors,
    );
}

apiClient.interceptors.response.use(
    (response) => response,

    async (error: unknown) => {
        if (!axios.isAxiosError(error)) {
            return Promise.reject(error);
        }

        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        const originalRequest = error.config;

        if (!originalRequest) {
            return Promise.reject(normalizeApiError(error));
        }

        const responseData = error.response?.data as
            | { message?: string }
            | undefined;

        const isCsrfError =
            error.response?.status === 403 &&
            responseData?.message === "Invalid or missing CSRF token";

        if (isCsrfError && !originalRequest._csrfRetry) {
            originalRequest._csrfRetry = true;

            csrfToken = null;
            csrfPromise = null;

            return apiClient(originalRequest);
        }

        const requestUrl = originalRequest.url ?? "";

        const isAuthEndpoint =
            /\/auth\/(login|register|refresh|logout)(?:\?|$)/.test(
                requestUrl,
            );

        const isUnauthorized = error.response?.status === 401;

        if (
            !isUnauthorized ||
            isAuthEndpoint ||
            originalRequest._retry
        ) {
            return Promise.reject(normalizeApiError(error));
        }

        originalRequest._retry = true;

        try {
            if (!refreshPromise) {
                refreshPromise = refreshAccessToken();
            }

            const newAccessToken = await refreshPromise;

            originalRequest.headers = AxiosHeaders.from(
                originalRequest.headers,
            );

            originalRequest.headers.set(
                "Authorization",
                `Bearer ${newAccessToken}`,
            );

            return apiClient(originalRequest);
        } catch {
            useAuthStore.getState().clearAuth();

            return Promise.reject(normalizeApiError(error));
        } finally {
            refreshPromise = null;
        }
    },
);
