import express from "express";
import cors from "cors";
import helmet from "helmet";

import apiRouter from "./routes/index.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(helmet());

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "DevFlow API is running",
        timestamp: new Date().toISOString(),
    });
});

app.use("/api/v1", apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;