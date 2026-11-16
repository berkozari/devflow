import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";

import viteConfig from "./vite.config";

// Preserve React, Tailwind and the @/ alias from the application's Vite config.
export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: "jsdom",
            setupFiles: ["./tests/setup.ts"],
            include: ["tests/**/*.{test,spec}.{ts,tsx}"],
            clearMocks: true,
            env: {
                // Only a placeholder; all HTTP calls in unit tests use a mocked adapter.
                VITE_API_BASE_URL: "http://127.0.0.1:4000/api/v1",
            },
            coverage: {
                provider: "v8",
                reporter: ["text", "html", "lcov"],
                include: ["src/**/*.{ts,tsx}"],
                exclude: [
                    "src/**/*.d.ts",
                    "src/main.tsx",
                ],
                thresholds: {
                    statements: 85,
                    branches: 80,
                    functions: 80,
                    lines: 85,
                },
            },
        },
    }),
);
