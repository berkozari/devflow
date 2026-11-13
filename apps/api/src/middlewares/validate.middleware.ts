
import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../utils/app-error.js";

interface ValidationSchemas {
    body?: ZodType;
    params?: ZodType;
    query?: ZodType;
}

declare global {
    namespace Express {
        interface Locals {
            validated?: {
                body?: unknown;
                params?: unknown;
                query?: unknown;
            };
        }
    }
}

export function validate(schema: ZodType): RequestHandler;

export function validate(schemas: ValidationSchemas): RequestHandler;

export function validate(
    input: ZodType | ValidationSchemas,
): RequestHandler {
    const schemas: ValidationSchemas =
        "safeParse" in input
            ? { body: input }
            : input;

    return (req, res, next) => {
        const validated: {
            body?: unknown;
            params?: unknown;
            query?: unknown;
        } = {};

        const errors: string[] = [];

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

            const result = source.schema.safeParse(source.value);

            if (!result.success) {
                errors.push(
                    ...result.error.issues.map(
                        (issue) => issue.message,
                    ),
                );

                continue;
            }

            validated[source.key] = result.data;
        }

        if (errors.length > 0) {
            return next(
                new AppError(errors.join(", "), 400),
            );
        }

        // Initialize locals for Express response mocks.
        res.locals ??= {};

        res.locals.validated = validated;

        // Preserve backward compatibility.
        if (validated.body !== undefined) {
            req.body = validated.body;
        }

        next();
    };
}
