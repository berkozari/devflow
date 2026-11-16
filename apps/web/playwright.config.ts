import { defineConfig, devices } from "@playwright/test";

// E2E tests create real users and projects. Never run against development or production data.
if (process.env.E2E_ISOLATED_DB !== "confirmed") {
    throw new Error(
        'E2E requires an isolated database. Verify the API test DB/Redis first, then set E2E_ISOLATED_DB=confirmed.',
    );
}

const apiBaseURL =
    process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

const apiURL = new URL(apiBaseURL);
if (
    !["localhost", "127.0.0.1"].includes(apiURL.hostname) ||
    apiURL.protocol !== "http:"
) {
    throw new Error("E2E_API_BASE_URL must be a local HTTP API URL.");
}

const webURL = "http://127.0.0.1:5173";

export default defineConfig({
    testDir: "./e2e",
    testMatch: /.*\.spec\.ts/,
    fullyParallel: false,
    workers: 1,
    retries: 0, // Mutating browser tests should not create duplicate data on retry.
    forbidOnly: Boolean(process.env.CI),
    timeout: 90_000,
    expect: { timeout: 12_000 },
    reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: webURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
    webServer: {
        command: "pnpm dev --host 127.0.0.1 --port 5173 --strictPort",
        url: webURL,
        reuseExistingServer: false,
        timeout: 45_000,
        env: {
            VITE_API_BASE_URL: apiBaseURL,
        },
    },
});
