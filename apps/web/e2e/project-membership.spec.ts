import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
    checkE2EBackend,
    createAndOpenProject,
    deleteProjectByUI,
    registerAndLogin,
} from "./e2e-helpers";

function memberCard(page: Page, email: string): Locator {
    // email <p> -> user-info div -> flex div -> member card div
    return page.getByText(email, { exact: true }).locator("xpath=../../..");
}

async function openMemberAction(page: Page, memberName: string, action: string): Promise<void> {
    await page.getByRole("button", { name: `${memberName} member actions` }).click();
    await page.getByRole("menuitem", { name: action, exact: true }).click();
}

test("owner adds a member, changes role, removes access; member privileges update", async ({
    page: ownerPage,
    browser,
}) => {
    await checkE2EBackend(ownerPage);
    const suffix = randomUUID().slice(0, 12);
    const owner = {
        name: "E2E Project Owner",
        email: `e2e-owner-${suffix}@example.test`,
        password: "E2eStrongPassword123!",
    };
    const member = {
        name: "E2E Project Member",
        email: `e2e-member-${suffix}@example.test`,
        password: "E2eStrongPassword123!",
    };

    // Separate browser contexts isolate JWT, cookies and localStorage.
    const memberContext = await browser.newContext({ baseURL: "http://127.0.0.1:5173" });
    const memberPage = await memberContext.newPage();
    let projectUrl: string | undefined;

    try {
        await registerAndLogin(memberPage, member);
        await registerAndLogin(ownerPage, owner);
        projectUrl = await createAndOpenProject(ownerPage, `E2E Members Project ${suffix}`);

        await ownerPage.getByRole("button", { name: "Add member" }).click();
        const addDialog = ownerPage.getByRole("dialog");
        await expect(addDialog.getByRole("heading", { name: "Add project member" })).toBeVisible();
        await addDialog.getByLabel("Email address").fill(member.email);
        await addDialog.getByLabel("Project role").selectOption("MEMBER");
        const addResponse = ownerPage.waitForResponse(
            (res) => res.request().method() === "POST" &&
                /\/projects\/[^/]+\/members$/.test(new URL(res.url()).pathname),
        );
        await addDialog.getByRole("button", { name: "Add member" }).click();
        expect((await addResponse).ok(), "Owner must be able to add a registered user").toBeTruthy();
        await expect(addDialog).toBeHidden();
        await expect(memberCard(ownerPage, member.email).getByText("Member", { exact: true })).toBeVisible();

        // Member may view the project but not manage its members.
        await memberPage.goto(projectUrl);
        await expect(memberPage.getByRole("heading", { name: `E2E Members Project ${suffix}` })).toBeVisible();
        await expect(memberPage.getByRole("button", { name: "Add member" })).toHaveCount(0);
        await expect(memberPage.getByRole("link", { name: "Project Settings" })).toHaveCount(0);

        // OWNER promotes MEMBER -> ADMIN through the actual Radix dropdown.
        await openMemberAction(ownerPage, member.name, "Change role");
        const roleSelect = ownerPage.locator('select:has(option[value="ADMIN"])');
        const promoteResponse = ownerPage.waitForResponse(
            (res) => res.request().method() === "PATCH" &&
                /\/projects\/[^/]+\/members\/[^/]+$/.test(new URL(res.url()).pathname),
        );
        await roleSelect.selectOption("ADMIN");
        expect((await promoteResponse).ok(), "Role promotion must be accepted").toBeTruthy();
        await expect(memberCard(ownerPage, member.email).getByText("Admin", { exact: true })).toBeVisible();

        await memberPage.reload();
        await expect(memberPage.getByRole("button", { name: "Add member" })).toBeVisible();
        // Admin can manage members but cannot assign roles through this UI.
        await memberPage.getByRole("button", { name: `${member.name} member actions` }).click();
        await expect(memberPage.getByRole("menuitem", { name: "Change role" })).toHaveCount(0);
        await memberPage.keyboard.press("Escape");

        // Restore MEMBER role and then remove from the project.
        await openMemberAction(ownerPage, member.name, "Change role");
        const demoteResponse = ownerPage.waitForResponse(
            (res) => res.request().method() === "PATCH" &&
                /\/projects\/[^/]+\/members\/[^/]+$/.test(new URL(res.url()).pathname),
        );
        await roleSelect.selectOption("MEMBER");
        expect((await demoteResponse).ok()).toBeTruthy();
        await expect(memberCard(ownerPage, member.email).getByText("Member", { exact: true })).toBeVisible();

        await openMemberAction(ownerPage, member.name, "Remove member");
        const removeDialog = ownerPage.getByRole("dialog");
        await expect(removeDialog.getByRole("heading", { name: "Remove project member?" })).toBeVisible();
        const removeResponse = ownerPage.waitForResponse(
            (res) => res.request().method() === "DELETE" &&
                /\/projects\/[^/]+\/members\/[^/]+$/.test(new URL(res.url()).pathname),
        );
        await removeDialog.getByRole("button", { name: "Remove member" }).click();
        expect((await removeResponse).ok()).toBeTruthy();
        await expect(ownerPage.getByText(member.email, { exact: true })).toHaveCount(0);

        await memberPage.reload();
        await expect(memberPage.getByRole("heading", { name: "Unable to load project" })).toBeVisible();
    } finally {
        await memberContext.close();
        if (projectUrl) {
            await deleteProjectByUI(ownerPage, projectUrl)
                .catch((error: unknown) => console.warn("E2E project cleanup failed:", error));
        }
    }
});
