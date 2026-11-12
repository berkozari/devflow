
import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config();

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

            include: ["src/**/*.ts"],

            exclude: [
                "src/generated/**",
                "src/**/*.d.ts",
                "src/**/*.config.ts",
                "src/index.ts",
                "src/config/database-test.ts",
                "tests/**",
            ],

            // Initial coverage thresholds.
            // We can increase these as test coverage improves.
            thresholds: {
                statements: 50,
                branches: 40,
                functions: 40,
                lines: 50,
            },
        },
    },
});
