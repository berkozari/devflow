import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";

import {
    csrfSessionMiddleware,
    doubleCsrfProtection,
} from "./config/csrf.js";

import apiRouter from "./routes/index.js";
import healthRouter from "./routes/health.routes.js";

import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/request-logger.middleware.js";
import { AppError } from "./utils/app-error.js";

const app = express();

app.use(requestLogger);
app.use(helmet());

// Health probes run before cookie, CSRF and application-route middleware.
app.use("/api/v1/health", healthRouter);

const allowedOrigins = [
    env.clientUrl1,
    env.clientUrl2,
].filter((origin): origin is string => Boolean(origin));

app.use(
    cors({
        origin: (origin, callback) => {
            // Requests without Origin may be valid non-browser API clients.
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new AppError("Origin not allowed", 403));
        },
        credentials: true,
        exposedHeaders: ["X-Request-ID"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-CSRF-Token",
        ],
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
    }),
);

app.use(express.json({ limit: "10kb" }));

app.use(
    express.urlencoded({
        extended: true,
        limit: "10kb",
        parameterLimit: 100,
    }),
);

app.use(cookieParser());

// Initialize CSRF session cookie.
app.use(csrfSessionMiddleware);

// Protect state-changing requests.
app.use(doubleCsrfProtection);

// API routes.
app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
