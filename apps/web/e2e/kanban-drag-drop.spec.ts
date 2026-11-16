import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
    checkE2EBackend,
    createAndOpenProject,
    deleteProjectByUI,
    registerAndLogin,
} from "./e2e-helpers";

// Four columns must fit in the viewport so pointer movement is deterministic.
test.use({ viewport: { width: 1680, height: 1000 } });

test("drag a real Kanban task to In Progress and persist it after reload", async ({ page }) => {
    await checkE2EBackend(page);
    const suffix = randomUUID().slice(0, 12);
    const taskName = `E2E Drag Task ${suffix}`;
    let projectUrl: string | undefined;

    try {
        await registerAndLogin(page, {
            name: "E2E Kanban Owner",
            email: `e2e-drag-${suffix}@example.test`,
            password: "E2eStrongPassword123!",
        });
        projectUrl = await createAndOpenProject(page, `E2E Drag Project ${suffix}`);

        await page.getByRole("button", { name: "Create task" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByPlaceholder("Enter task title").fill(taskName);
        await dialog.getByRole("button", { name: "Create task" }).click();
        await expect(dialog).toBeHidden();

        const todoColumn = page.getByRole("heading", { name: "To Do", exact: true })
            .locator("xpath=../../..");
        const inProgressColumn = page.getByRole("heading", { name: "In Progress", exact: true })
            .locator("xpath=../../..");
        await expect(todoColumn.getByRole("heading", { name: taskName })).toBeVisible();

        const handle = page.getByRole("button", { name: `Drag task: ${taskName}` });
        await handle.scrollIntoViewIfNeeded();
        await inProgressColumn.scrollIntoViewIfNeeded();
        const source = await handle.boundingBox();
        const destination = await inProgressColumn.boundingBox();
        expect(source, "Task drag handle must have a bounding box").not.toBeNull();
        expect(destination, "In Progress drop target must have a bounding box").not.toBeNull();

        // dnd-kit uses a PointerSensor with a 5px activation distance.
        // Move past that threshold before dropping inside the target column.
        const startX = source!.x + source!.width / 2;
        const startY = source!.y + source!.height / 2;
        const endX = destination!.x + destination!.width / 2;
        const endY = destination!.y + destination!.height * 0.65;

        const moveResponse = page.waitForResponse(
            (res) => res.request().method() === "PATCH" &&
                /\/projects\/[^/]+\/tasks\/[^/]+\/move$/.test(new URL(res.url()).pathname),
            { timeout: 15_000 },
        );
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 12, startY + 12, { steps: 4 });
        await page.mouse.move(endX, endY, { steps: 20 });
        await page.mouse.up();
        expect((await moveResponse).ok(), "Drag operation must be accepted by the API").toBeTruthy();

        await expect(inProgressColumn.getByRole("heading", { name: taskName })).toBeVisible();
        await expect(todoColumn.getByRole("heading", { name: taskName })).toHaveCount(0);

        // Verifies server persistence; not merely optimistic React Query state.
        await page.reload();
        await expect(inProgressColumn.getByRole("heading", { name: taskName })).toBeVisible();
    } finally {
        if (projectUrl) {
            await deleteProjectByUI(page, projectUrl)
                .catch((error: unknown) => console.warn("E2E project cleanup failed:", error));
        }
    }
});
