
import { resolve } from "node:path";

import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Load the dedicated test environment.
const result = dotenv.config({
    path: resolve(process.cwd(), ".env.test"),
    override: true,
});

if (result.error) {
    throw new Error(
        "Missing .env.test configuration",
    );
}

const testDatabaseUrl =
    result.parsed?.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
    throw new Error(
        "TEST_DATABASE_URL is required",
    );
}

// Validate the test database target.
const url = new URL(testDatabaseUrl);

const allowedProtocols = [
    "postgres:",
    "postgresql:",
];

const allowedHosts = [
    "localhost",
    "127.0.0.1",
    "[::1]",
];

const databaseName = decodeURIComponent(
    url.pathname.slice(1),
);

if (
    !allowedProtocols.includes(url.protocol) ||
    !allowedHosts.includes(url.hostname) ||
    databaseName !== "devflow_test"
) {
    throw new Error(
        "Tests must use the local devflow_test database",
    );
}

// Configure the environment before application imports.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],

        environment: "node",

        globals: false,

        testTimeout: 15000,

        hookTimeout: 15000,

        fileParallelism: false,

        sequence: {
            concurrent: false,
        },

        coverage: {
            provider: "v8",

            reporter: [
                "text",
                "html",
                "lcov",
            ],

            reportsDirectory: "./coverage",

            include: [
                "src/**/*.ts",
            ],

            exclude: [
                "src/generated/**",
                "src/**/*.d.ts",
                "src/**/*.config.ts",
                "src/index.ts",
                "src/config/database-test.ts",
                "tests/**",
            ],

            thresholds: {
                statements: 85,
                branches: 75,
                functions: 85,
                lines: 85,
            },
        },
    },
});
