
import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import {
    RequestValidationError,
    type ValidationErrorDetail,
} from "../utils/app-error.js";

interface ValidationSchemas {
    body?: ZodType;
    params?: ZodType;
    query?: ZodType;
}

type ValidatedRequest = {
    body?: unknown;
    params?: unknown;
    query?: unknown;
};

declare global {
    namespace Express {
        interface Locals {
            validated?: ValidatedRequest;
        }
    }
}

export function validate(schema: ZodType): RequestHandler;

export function validate(
    schemas: ValidationSchemas,
): RequestHandler;

export function validate(
    input: ZodType | ValidationSchemas,
): RequestHandler {
    const schemas: ValidationSchemas =
        "safeParse" in input
            ? { body: input }
            : input;

    return (req, res, next) => {
        const validated: ValidatedRequest = {};
        const errors: ValidationErrorDetail[] = [];

        const sources = [
            {
                key: "body" as const,
                schema: schemas.body,
                value: req.body,
            },
            {
                key: "params" as const,
                schema: schemas.params,
                value: req.params,
            },
            {
                key: "query" as const,
                schema: schemas.query,
                value: req.query,
            },
        ];

        for (const source of sources) {
            if (!source.schema) continue;

            const result = source.schema.safeParse(
                source.value,
            );

            if (!result.success) {
                errors.push(
                    ...result.error.issues.map((issue) => ({
                        field: [
                            source.key,
                            ...issue.path.map(String),
                        ].join("."),
                        message: issue.message,
                    })),
                );

                continue;
            }

            validated[source.key] = result.data;
        }

        if (errors.length > 0) {
            return next(
                new RequestValidationError(errors),
            );
        }

        res.locals.validated = {
            ...res.locals.validated,
            ...validated,
        };

        if (validated.body !== undefined) {
            req.body = validated.body;
        }

        next();
    };
}
