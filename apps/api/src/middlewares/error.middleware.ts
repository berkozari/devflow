import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

export const errorMiddleware: ErrorRequestHandler = (
    error,
    _req,
    res,
    _next,
) => {
    const isOperational = error instanceof AppError;

    const statusCode = isOperational
        ? error.statusCode
        : 500;

    const message = isOperational
        ? error.message
        : "Internal server error";

    if (!isOperational) {
        console.error("[DevFlow Error]", error);
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};