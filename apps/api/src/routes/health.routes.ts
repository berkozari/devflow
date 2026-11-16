import { Router } from "express";

import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";

const router = Router();
const CHECK_TIMEOUT_MS = 2_000;

// Bound a dependency probe so an unresponsive service never holds up readiness.
function withTimeout<T>(
    operation: () => PromiseLike<T>,
    timeoutMs: number,
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
            reject(new Error("Health dependency check timed out"));
        }, timeoutMs);
    });

    return Promise.race([
        Promise.resolve().then(operation),
        timeout,
    ]).finally(() => {
        if (timer !== undefined) clearTimeout(timer);
    });
}

// Process is alive and can answer HTTP. No external dependency probes here.
router.get("/live", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ status: "ok" });
});

// The application can serve real requests only when both dependencies work.
router.get("/ready", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");

    const [database, cache] = await Promise.allSettled([
        withTimeout(() => prisma.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS),
        withTimeout(() => redis.ping(), CHECK_TIMEOUT_MS),
    ]);

    const ready =
        database.status === "fulfilled" &&
        cache.status === "fulfilled" &&
        cache.value === "PONG";

    // Do not disclose connection strings, service internals, or failure details.
    res.status(ready ? 200 : 503).json({
        status: ready ? "ok" : "unavailable",
    });
});

export default router;
