import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/projects/components/CreateProjectDialog", () => ({
    CreateProjectDialog: ({ open, onOpenChange }: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
    }) => <div data-testid="create-dialog" data-open={String(open)}>
        <button onClick={() => onOpenChange(false)}>Close creation</button>
    </div>,
}));
vi.mock("@/features/projects/components/ProjectList", () => ({
    ProjectList: ({ onCreateProject }: { onCreateProject: () => void }) =>
        <button onClick={onCreateProject}>New project from empty state</button>,
}));

import { ProjectsPage } from "@/pages/projects/ProjectsPage";

beforeEach(() => { vi.clearAllMocks(); });

describe("ProjectsPage integration with its children", () => {
    it("renders page title and starts with the creation dialog closed", () => {
        render(<ProjectsPage />);
        expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
        expect(screen.getByTestId("create-dialog")).toHaveAttribute("data-open", "false");
    });
    it("opens the creation dialog from the project list and closes it again", async () => {
        render(<ProjectsPage />);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "New project from empty state" }));
        expect(screen.getByTestId("create-dialog")).toHaveAttribute("data-open", "true");
        await user.click(screen.getByRole("button", { name: "Close creation" }));
        expect(screen.getByTestId("create-dialog")).toHaveAttribute("data-open", "false");
    });
});
