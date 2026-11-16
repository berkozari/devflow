import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import helmet from "helmet";
import { parse } from "yaml";
import swaggerUi from "swagger-ui-express";

import type { Express } from "express";

import { env } from "./env.js";

/**
 * API documentation is deliberately not exposed by default in production.
 * The source YAML remains available in the repository for offline inspection.
 */
export function configureSwagger(app: Express): void {
    if (env.nodeEnv === "production") {
        return;
    }

    // Both src/config/ and dist/config/ are two levels below apps/api/.
    const specificationPath = fileURLToPath(
        new URL("../../docs/openapi/openapi.yaml", import.meta.url),
    );

    const document: unknown = parse(
        readFileSync(specificationPath, "utf8"),
    );

    if (
        !document ||
        typeof document !== "object" ||
        (document as Record<string, unknown>).openapi !== "3.1.0"
    ) {
        throw new Error("Invalid DevFlow OpenAPI document");
    }

    // Helmet's global CSP is kept. On the local documentation path only,
    // permit the inline scripts and styles used by the Swagger UI template.
    const docsContentSecurityPolicy = helmet.contentSecurityPolicy({
        useDefaults: false,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
        },
    });

    app.use(
        "/api-docs",
        docsContentSecurityPolicy,
        swaggerUi.serve,
        swaggerUi.setup(document, {
            customSiteTitle: "DevFlow API Documentation",
            swaggerOptions: {
                validatorUrl: null,
                supportedSubmitMethods: [],
            },
        }),
    );
}
