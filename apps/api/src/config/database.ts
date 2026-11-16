import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
}

// Defense in depth: never initialize a test Prisma client against the dev DB.
if (process.env.NODE_ENV === "test") {
    const expected = process.env.TEST_DATABASE_URL;

    if (!expected || connectionString !== expected) {
        throw new Error(
            "Test DATABASE_URL must match TEST_DATABASE_URL",
        );
    }

    let url: URL;
    try {
        url = new URL(connectionString);
    } catch {
        throw new Error("Test DATABASE_URL is not a valid URL");
    }

    const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    const databaseName = decodeURIComponent(url.pathname.slice(1));

    if (
        !["postgresql:", "postgres:"].includes(url.protocol) ||
        !allowedHosts.has(url.hostname) ||
        databaseName !== "devflow_test"
    ) {
        throw new Error(
            "Refusing to connect tests to a non-test database",
        );
    }
}

const adapter = new PrismaPg({
    connectionString,
});

export const prisma = new PrismaClient({
    adapter,
});