import { expect, test } from "@playwright/test";

test("guest opening a protected project page is redirected to login", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("invalid credentials show an authentication error without logging in", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Enter your email").fill("nonexistent-e2e@example.test");
    await page.getByPlaceholder("Enter your password").fill("incorrect-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
});
