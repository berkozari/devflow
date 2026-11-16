import { expect, type Page } from "@playwright/test";

export interface E2EAccount {
    name: string;
    email: string;
    password: string;
}

/** Register/login through the real browser; do not bypass auth or mock API calls. */
export async function registerAndLogin(page: Page, account: E2EAccount): Promise<void> {
    await page.goto("/register");
    await page.getByPlaceholder("Your name").fill(account.name);
    await page.getByPlaceholder("Your email").fill(account.email);
    await page.getByPlaceholder("At least 8 characters").fill(account.password);

    const [response] = await Promise.all([
        page.waitForResponse(
            (res) => res.request().method() === "POST" &&
                new URL(res.url()).pathname.endsWith("/auth/register"),
        ),
        page.getByRole("button", { name: "Create Account" }).click(),
    ]);
    expect(response.status(), "Registration must succeed before continuing").toBe(201);
    await expect(page).toHaveURL(/\/login$/);

    await page.getByPlaceholder("Enter your email").fill(account.email);
    await page.getByPlaceholder("Enter your password").fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
}

/** Creates a project in a brand-new user's empty project list and opens it. */
export async function createAndOpenProject(page: Page, projectName: string): Promise<string> {
    await page.goto("/projects");
    await page.getByRole("button", { name: "Create your first project" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Enter project name").fill(projectName);
    await dialog.getByPlaceholder("Describe your project").fill("Isolated E2E test project");
    await dialog.getByRole("button", { name: "Create Project" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("link", { name: `View project ${projectName}` }).click();
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
    return page.url();
}

/** Best-effort cleanup by the owner through the real UI, including its confirmation. */
export async function deleteProjectByUI(page: Page, projectUrl: string): Promise<void> {
    await page.goto(`${projectUrl.replace(/\/$/, "")}/settings`);
    await page.getByRole("button", { name: "Delete Project" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Delete Project?" })).toBeVisible();
    await dialog.getByRole("button", { name: "Delete Project" }).click();
    await expect(page).toHaveURL(/\/projects$/);
}

/** Ensure the backend endpoint is available before creating persistent test records. */
export async function checkE2EBackend(page: Page): Promise<void> {
    const base = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";
    const response = await page.request.get(`${base.replace(/\/$/, "")}/auth/csrf-token`);
    expect(response.ok(), "Isolated E2E backend must be running").toBeTruthy();
}
