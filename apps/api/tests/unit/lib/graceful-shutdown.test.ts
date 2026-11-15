
import type { Server } from "node:http";

import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { createGracefulShutdown } from "../../../src/lib/graceful-shutdown.js";

describe("Graceful Shutdown", () => {
    const createDependencies = () => {
        const closeCallback = vi.fn();

        const server = {
            listening: true,
            close: vi.fn((callback) => {
                closeCallback.mockImplementation(callback);
            }),
            closeAllConnections: vi.fn(() => {
                closeCallback(null);
            }),
        };

        const disconnect = vi.fn().mockResolvedValue(undefined);

        const logger = {
            info: vi.fn(),
            error: vi.fn(),
        };

        return {
            server,
            closeCallback,
            disconnect,
            logger,
        };
    };

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should close HTTP server and disconnect database", async () => {
        const deps = createDependencies();

        const shutdown = createGracefulShutdown({
            server: () => deps.server as unknown as Server,
            disconnect: deps.disconnect,
            logger: deps.logger,
        });

        const promise = shutdown("SIGTERM");

        deps.closeCallback(null);

        await promise;

        expect(deps.server.close).toHaveBeenCalledOnce();
        expect(deps.disconnect).toHaveBeenCalledOnce();

        expect(deps.logger.info).toHaveBeenCalledWith(
            "Graceful shutdown completed",
        );
    });

    it("should execute shutdown only once", async () => {
        const deps = createDependencies();

        const shutdown = createGracefulShutdown({
            server: () => deps.server as unknown as Server,
            disconnect: deps.disconnect,
            logger: deps.logger,
        });

        const first = shutdown("SIGTERM");
        const second = shutdown("SIGINT");

        expect(first).toBe(second);

        deps.closeCallback(null);

        await Promise.all([first, second]);

        expect(deps.server.close).toHaveBeenCalledOnce();
        expect(deps.disconnect).toHaveBeenCalledOnce();
    });

    it("should disconnect database even if HTTP server closing fails", async () => {
        const deps = createDependencies();

        const closeError = new Error("HTTP close failed");

        // Simulate an HTTP server close failure.
        deps.server.close.mockImplementation((callback) => {
            callback(closeError);
        });

        const shutdown = createGracefulShutdown({
            server: () => deps.server as unknown as Server,
            disconnect: deps.disconnect,
            logger: deps.logger,
        });

        await expect(shutdown("SIGTERM")).rejects.toThrow(
            "HTTP close failed",
        );

        expect(deps.server.close).toHaveBeenCalledOnce();

        expect(
            deps.server.closeAllConnections,
        ).toHaveBeenCalledOnce();

        expect(deps.disconnect).toHaveBeenCalledOnce();

        expect(deps.logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: closeError,
            }),
            "HTTP server shutdown failed",
        );
    });

    it("should handle database disconnect errors", async () => {
        const deps = createDependencies();

        const disconnectError = new Error("Database disconnect failed");

        deps.disconnect.mockRejectedValue(disconnectError);

        const shutdown = createGracefulShutdown({
            server: () => deps.server as unknown as Server,
            disconnect: deps.disconnect,
            logger: deps.logger,
        });

        const promise = shutdown("SIGTERM");

        deps.closeCallback(null);

        await expect(promise).rejects.toThrow(
            "Database disconnect failed",
        );

        expect(deps.logger.error).toHaveBeenCalled();
    });

    it("should force close connections after timeout", async () => {
        vi.useFakeTimers();

        const deps = createDependencies();

        const shutdown = createGracefulShutdown({
            server: () => deps.server as unknown as Server,
            disconnect: deps.disconnect,
            logger: deps.logger,
            timeoutMs: 1000,
        });

        const promise = shutdown("SIGTERM");

        await vi.advanceTimersByTimeAsync(1000);

        await promise;

        expect(deps.server.closeAllConnections).toHaveBeenCalledOnce();
        expect(deps.disconnect).toHaveBeenCalledOnce();
    });

    it("should disconnect database when server is not listening", async () => {
        const deps = createDependencies();

        deps.server.listening = false;

        const shutdown = createGracefulShutdown({
            server: () => deps.server as unknown as Server,
            disconnect: deps.disconnect,
            logger: deps.logger,
        });

        await shutdown("SIGTERM");

        expect(deps.server.close).not.toHaveBeenCalled();
        expect(deps.disconnect).toHaveBeenCalledOnce();
    });
});
