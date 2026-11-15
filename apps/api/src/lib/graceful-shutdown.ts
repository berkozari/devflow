import type { Server } from "node:http";

import { logger as defaultLogger } from "./logger.js";

interface ShutdownLogger {
    info: (obj: object | string, msg?: string) => void;
    error: (obj: object | string, msg?: string) => void;
}

interface GracefulShutdownOptions {
    server?: () => Server | undefined;
    disconnect: () => Promise<void>;
    logger?: ShutdownLogger;
    timeoutMs?: number;
}

export function createGracefulShutdown({
    server,
    disconnect,
    logger = defaultLogger,
    timeoutMs = 10_000,
}: GracefulShutdownOptions) {
    let shutdownPromise: Promise<void> | undefined;

    return function shutdown(reason: string): Promise<void> {
        if (shutdownPromise) {
            return shutdownPromise;
        }

        shutdownPromise = (async () => {
            logger.info({ reason }, "Graceful shutdown started");

            let shutdownError: unknown;
            const activeServer = server?.();

            if (activeServer?.listening) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        let settled = false;
                        let timeout: ReturnType<typeof setTimeout>;

                        const complete = (error?: Error) => {
                            if (settled) return;
                            settled = true;
                            clearTimeout(timeout);

                            if (error) {
                                reject(error);
                            } else {
                                resolve();
                            }
                        };

                        timeout = setTimeout(() => {
                            logger.error(
                                { timeoutMs },
                                "HTTP shutdown timeout exceeded; forcing connections closed",
                            );

                            try {
                                activeServer.closeAllConnections();
                            } catch (error) {
                                logger.error(
                                    { err: error },
                                    "Failed to force close HTTP connections",
                                );
                            }

                            complete(
                                new Error(
                                    `HTTP shutdown exceeded ${timeoutMs}ms`,
                                ),
                            );
                        }, timeoutMs);

                        timeout.unref();

                        try {
                            activeServer.close((error) => {
                                complete(error ?? undefined);
                            });
                        } catch (error) {
                            complete(
                                error instanceof Error
                                    ? error
                                    : new Error("HTTP server close failed"),
                            );
                        }
                    });

                    logger.info("HTTP server closed");
                } catch (error) {
                    shutdownError = error;

                    logger.error(
                        { err: error },
                        "HTTP server shutdown failed",
                    );

                    try {
                        activeServer.closeAllConnections();
                    } catch (closeError) {
                        logger.error(
                            { err: closeError },
                            "Could not force close HTTP connections",
                        );
                    }
                }
            }

            try {
                await disconnect();
                logger.info("Database and Redis connections closed");
            } catch (error) {
                shutdownError ??= error;
                logger.error(
                    { err: error },
                    "Connection shutdown failed",
                );
            }

            if (shutdownError) {
                logger.error(
                    { err: shutdownError },
                    "Graceful shutdown completed with errors",
                );
                throw shutdownError;
            }

            logger.info("Graceful shutdown completed");
        })();

        return shutdownPromise;
    };
}
