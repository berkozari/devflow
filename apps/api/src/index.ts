import type { Server } from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";
import { logger } from "./lib/logger.js";
import { createGracefulShutdown } from "./lib/graceful-shutdown.js";
import { redis } from "./config/redis.js";

let server: Server | undefined;
let stopping = false;
let hardStopTimer: ReturnType<typeof setTimeout> | undefined;

// Resolves even when startup fails, so shutdown never disconnects resources
// while the startup routine is still connecting to them.
let markStartupSettled!: () => void;
const startupSettled = new Promise<void>((resolve) => {
    markStartupSettled = resolve;
});

async function disconnectResources(): Promise<void> {
    const [databaseResult, redisResult] = await Promise.allSettled([
        prisma.$disconnect(),
        // quit() is intended for established connections. For a connection
        // that never became ready (or is reconnecting), disconnect instead.
        redis.status === "ready"
            ? redis.quit()
            : Promise.resolve().then(() => redis.disconnect()),
    ]);

    if (databaseResult.status === "rejected") {
        logger.error(
            { err: databaseResult.reason },
            "Failed to disconnect PostgreSQL",
        );
    }

    if (redisResult.status === "rejected") {
        logger.error(
            { err: redisResult.reason },
            "Failed to disconnect Redis",
        );
    }

    // Let graceful-shutdown.ts report unsuccessful cleanup to callers.
    if (databaseResult.status === "rejected") {
        throw databaseResult.reason;
    }

    if (redisResult.status === "rejected") {
        throw redisResult.reason;
    }
}

const shutdown = createGracefulShutdown({
    server: () => server,
    disconnect: async () => {
        await startupSettled;
        await disconnectResources();
    },
    logger,
    timeoutMs: 10_000,
});

function requestShutdown(reason: string): void {
    stopping = true;

    // The helper bounds HTTP draining; this outer deadline also covers
    // an unfinished startup or a blocked database/Redis disconnect.
    if (!hardStopTimer) {
        hardStopTimer = setTimeout(() => {
            logger.fatal(
                { reason },
                "Shutdown hard deadline exceeded; terminating process",
            );
            process.exit(1);
        }, 20_000);
    }

    void shutdown(reason)
        .catch((error) => {
            process.exitCode = 1;
            logger.error(
                { err: error, reason },
                "Graceful shutdown failed",
            );
        })
        .finally(() => {
            if (hardStopTimer) {
                clearTimeout(hardStopTimer);
                hardStopTimer = undefined;
            }
        });
}

async function startServer(): Promise<void> {
    try {
        await prisma.$connect();
        if (stopping) return;

        const redisResponse = await redis.ping();

        if (redisResponse !== "PONG") {
            throw new Error("Redis health check failed");
        }
        if (stopping) return;

        logger.info("Database and Redis connected successfully");

        server = app.listen(env.port, () => {
            if (!stopping) {
                logger.info(
                    { port: env.port },
                    "DevFlow API server started",
                );
            }
        });

        server.on("error", (error) => {
            logger.fatal(
                { err: error },
                "HTTP server error",
            );

            process.exitCode = 1;
            requestShutdown("SERVER_ERROR");
        });
    } catch (error) {
        logger.fatal(
            { err: error },
            "Failed to start server",
        );

        process.exitCode = 1;
        stopping = true;

        // When shutdown was already requested, it owns cleanup.
        if (!hardStopTimer) {
            try {
                await disconnectResources();
            } catch (cleanupError) {
                logger.error(
                    { err: cleanupError },
                    "Cleanup failed after startup error",
                );
            }
        }
    } finally {
        markStartupSettled();
    }
}

process.once("SIGTERM", () => {
    requestShutdown("SIGTERM");
});

process.once("SIGINT", () => {
    requestShutdown("SIGINT");
});

void startServer();
