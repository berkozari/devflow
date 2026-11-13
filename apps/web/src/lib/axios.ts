
import axios from "axios";

import { ApiError } from "../utils/api-error";

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
    throw new Error("VITE_API_BASE_URL is not configured");
}

export const apiClient = axios.create({
    baseURL,
    timeout: 10_000,
    withCredentials: true,
    headers: {
        Accept: "application/json",
    },
});

apiClient.interceptors.response.use(
    (response) => response,

    (error: unknown) => {
        if (!axios.isAxiosError(error)) {
            return Promise.reject(error);
        }

        if (axios.isCancel(error)) {
            return Promise.reject(error);
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

        return Promise.reject(
            new ApiError(
                message,
                status,
                error.code,
                validationErrors,
            ),
        );
    },
);
