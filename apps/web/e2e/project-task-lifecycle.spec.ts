import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

// No mocked APIs: this scenario exercises the real browser, API, test DB, and Redis.
// Run ONLY with an isolated E2E backend and the config's explicit safety confirmation.
test("register, login, create project and task, update status, delete project, logout", async ({
    page,
    request,
}) => {
    const apiBaseURL =
        process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

    // Preflight: fail clearly if the test API is not started.
    const csrfResponse = await request.get(`${apiBaseURL}/auth/csrf-token`);
    expect(csrfResponse.ok(), "The isolated API must be running before E2E").toBeTruthy();

    const suffix = randomUUID().slice(0, 12);
    const email = `devflow-e2e-${suffix}@example.test`;
    const password = "E2eStrongPassword123!";
    const projectName = `E2E Project ${suffix}`;
    const taskName = `E2E Task ${suffix}`;

    // Create a fresh account so this run never depends on existing seed users.
    await page.goto("/register");
    await page.getByPlaceholder("Your name").fill("E2E Tester");
    await page.getByPlaceholder("Your email").fill(email);
    await page.getByPlaceholder("At least 8 characters").fill(password);
    // Observe the actual browser registration request before clicking the form.
    // A successful API preflight alone does not prove browser POST/CORS/CSRF works.
    const authNetworkFailures: string[] = [];
    page.on("requestfailed", (request) => {
        const url = new URL(request.url());
        if (url.pathname.startsWith("/api/v1/auth/")) {
            authNetworkFailures.push(
                `${request.method()} ${url.pathname}: ${request.failure()?.errorText ?? "unknown network error"}`,
            );
        }
    });

    const registrationResponsePromise = page
        .waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                response.url().startsWith(`${apiBaseURL.replace(/\/$/, "")}/auth/register`),
            { timeout: 10_000 },
        )
        .catch(() => null);

    await page.getByRole("button", { name: "Create Account" }).click();

    const registrationResponse = await registrationResponsePromise;
    if (!registrationResponse) {
        const fieldErrors = await page.locator('[role="alert"]').allTextContents();
        const rootError = await page
            .getByText("Registration failed. Please try again.")
            .allTextContents();
        throw new Error(
            "Browser did not receive an /auth/register POST response. " +
                `Form errors: ${JSON.stringify([...fieldErrors, ...rootError])}; ` +
                `auth network failures: ${JSON.stringify(authNetworkFailures)}. ` +
                "Check field validation, CORS, CSRF and browser Network tab.",
        );
    }

    if (registrationResponse.status() !== 201) {
        const apiError = (await registrationResponse.json().catch(() => null)) as
            | { message?: unknown }
            | null;
        const message =
            apiError && typeof apiError.message === "string"
                ? apiError.message
                : "No API error message";
        throw new Error(
            `Registration rejected: HTTP ${registrationResponse.status()} — ${message}. ` +
                `Auth network failures: ${JSON.stringify(authNetworkFailures)}`,
        );
    }

    await expect(page).toHaveURL(/\/login$/);

    await page.getByPlaceholder("Enter your email").fill(email);
    await page.getByPlaceholder("Enter your password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // New account has no projects. Open the controlled dialog through the empty state.
    await page.goto("/projects");
    await page.getByRole("button", { name: "Create your first project" }).click();
    const createProjectDialog = page.getByRole("dialog");
    await expect(createProjectDialog).toBeVisible();
    await createProjectDialog.getByPlaceholder("Enter project name").fill(projectName);
    await createProjectDialog
        .getByPlaceholder("Describe your project")
        .fill("Created exclusively by the automated E2E test.");
    await createProjectDialog.getByRole("button", { name: "Create Project" }).click();
    await expect(createProjectDialog).toBeHidden();

    await page.getByRole("link", { name: `View project ${projectName}` }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/i);
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

    // Add a real task through the browser form.
    await page.getByRole("button", { name: "Create task" }).click();
    const taskDialog = page.getByRole("dialog");
    await expect(taskDialog.getByRole("heading", { name: "Create task" })).toBeVisible();
    await taskDialog.getByPlaceholder("Enter task title").fill(taskName);
    await taskDialog.getByRole("button", { name: "Create task" }).click();
    await expect(taskDialog).toBeHidden();
    await expect(page.getByRole("heading", { name: taskName })).toBeVisible();

    // Editing status tests persistence and cache refresh without mocking dnd-kit.
    await page.getByRole("heading", { name: taskName }).click();
    await page.getByRole("button", { name: "Edit task" }).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog.getByRole("heading", { name: "Edit task" })).toBeVisible();
    await editDialog.getByLabel("Status").selectOption("DONE");
    await editDialog.getByRole("button", { name: "Save changes" }).click();
    await expect(editDialog).toBeHidden();

    const doneColumn = page
        .getByRole("heading", { name: "Done", exact: true })
        .locator("xpath=../../..");
    await expect(doneColumn.getByRole("heading", { name: taskName })).toBeVisible();

    // Clean up the project via the same owner-only UI used by real users.
    await page.getByRole("link", { name: "Project Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await page.getByRole("button", { name: "Delete Project" }).click();
    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog.getByRole("heading", { name: "Delete Project?" })).toBeVisible();
    await deleteDialog.getByRole("button", { name: "Delete Project" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("link", { name: `View project ${projectName}` })).toHaveCount(0);

    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login$/);
});
