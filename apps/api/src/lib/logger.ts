
import pino from "pino";

import { env } from "../config/env.js";

export const logger = pino({
    level: env.logLevel,

    base: {
        service: "devflow-api",
        environment: env.nodeEnv,
    },

    timestamp: pino.stdTimeFunctions.isoTime,

    redact: {
        paths: [
            "password",
            "*.password",
            "accessToken",
            "refreshToken",
            "token",
            "authorization",

            "req.headers.authorization",
            "req.headers.cookie",
            "req.headers['x-csrf-token']",

            "res.headers['set-cookie']",

            "err.body",
        ],
        censor: "[REDACTED]",
    },
});
