
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";

import apiRouter from "./routes/index.js";

import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

import cookieParser from "cookie-parser";

const app = express();

// Security headers
app.use(helmet());

const allowedOrigins = [
    env.clientUrl1,
    env.clientUrl2
];

// CORS
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    }),
);

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// API routes
app.use("/api/v1", apiRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
