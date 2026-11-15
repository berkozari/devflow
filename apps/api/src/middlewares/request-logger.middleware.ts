import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";

import { logger } from "../lib/logger.js";

export const requestLogger = pinoHttp({
    logger,

    genReqId: (_req, res) => {
        const requestId = randomUUID();

        res.setHeader("X-Request-ID", requestId);

        return requestId;
    },

    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url?.split("?")[0],
            };
        },

        res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },

    customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) {
            return "error";
        }

        if (res.statusCode >= 400) {
            return "warn";
        }

        return "info";
    },

    customSuccessMessage: (req, res) => {
        const path = req.url?.split("?")[0];

        return `${req.method} ${path} completed with ${res.statusCode}`;
    },

    customErrorMessage: (req, res) => {
        const path = req.url?.split("?")[0];

        return `${req.method} ${path} failed with ${res.statusCode}`;
    },

    autoLogging: {
        ignore: (req) =>
            req.url?.split("?")[0] === "/health",
    },
});
