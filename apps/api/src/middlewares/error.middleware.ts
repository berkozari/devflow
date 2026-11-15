import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { logger } from "../lib/logger.js";
import {
    AppError,
    RequestValidationError,
} from "../utils/app-error.js";
import { invalidCsrfTokenError } from "../config/csrf.js";

// Respond using safe, fixed messages: parse errors may carry the original body.
const bodyParserErrors: Record<
    string,
    { statusCode: number; message: string }
> = {
    "entity.parse.failed": {
        statusCode: 400,
        message: "Malformed request body",
    },
    "request.size.invalid": {
        statusCode: 400,
        message: "Invalid request body size",
    },
    "entity.too.large": {
        statusCode: 413,
        message: "Request body is too large",
    },
    "parameters.too.many": {
        statusCode: 413,
        message: "Too many request parameters",
    },
    "encoding.unsupported": {
        statusCode: 415,
        message: "Unsupported content encoding",
    },
    "charset.unsupported": {
        statusCode: 415,
        message: "Unsupported character set",
    },
    "entity.verify.failed": {
        statusCode: 403,
        message: "Request body verification failed",
    },
    "request.aborted": {
        statusCode: 400,
        message: "Request body was not fully received",
    },
};

export const errorHandler: ErrorRequestHandler = (
    error,
    req,
    res,
    next,
) => {
    if (res.headersSent) {
        next(error);
        return;
    }

    const context = {
        requestId: req.id,
        method: req.method,
        path: req.path,
    };

    if (error === invalidCsrfTokenError) {
        logger.warn(context, "CSRF validation failed");

        res.status(403).json({
            success: false,
            message: "Invalid or missing CSRF token",
        });
        return;
    }

    // Do not log the raw body or serialize a body-parser Error object.
    const bodyParserErrorType: string | undefined =
        typeof error === "object" &&
            error !== null &&
            "type" in error &&
            typeof error.type === "string"
            ? error.type
            : undefined;

    const bodyParserError = bodyParserErrorType
        ? bodyParserErrors[bodyParserErrorType]
        : undefined;

    if (bodyParserError) {
        logger.warn(
            {
                ...context,
                errorType: bodyParserErrorType,
                statusCode: bodyParserError.statusCode,
            },
            "Request body parsing failed",
        );

        res.status(bodyParserError.statusCode).json({
            success: false,
            message: bodyParserError.message,
        });
        return;
    }

    if (error instanceof RequestValidationError) {
        logger.warn(
            {
                ...context,
                fields: error.errors.map((issue) => issue.field),
            },
            "Request validation failed",
        );

        res.status(400).json({
            success: false,
            message: error.message,
            errors: error.errors,
        });
        return;
    }

    if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
            field: issue.path.map(String).join("."),
            message: issue.message,
        }));

        logger.warn(
            {
                ...context,
                fields: errors.map((issue) => issue.field),
            },
            "Zod validation failed",
        );

        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors,
        });
        return;
    }

    if (error instanceof AppError) {
        const statusCode = error.statusCode;

        if (statusCode >= 500) {
            logger.error(
                {
                    ...context,
                    err: error,
                    statusCode,
                },
                "Application error",
            );
        } else {
            logger.warn(
                {
                    ...context,
                    statusCode,
                },
                error.message,
            );
        }

        res.status(statusCode).json({
            success: false,
            message:
                statusCode >= 500
                    ? "Internal server error"
                    : error.message,
        });
        return;
    }

    logger.error(
        {
            ...context,
            err: error,
        },
        "Unhandled application error",
    );

    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
};
