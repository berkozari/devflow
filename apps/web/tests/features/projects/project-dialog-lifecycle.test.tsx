import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/features/projects/hooks/useCreateProject", () => ({ useCreateProject: vi.fn() }));
vi.mock("@/features/projects/hooks/useDeleteProject", () => ({ useDeleteProject: vi.fn() }));

import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog";
import { DeleteProjectDialog } from "@/features/projects/components/DeleteProjectDialog";
import { useCreateProject } from "@/features/projects/hooks/useCreateProject";
import { useDeleteProject } from "@/features/projects/hooks/useDeleteProject";

const createAsync = vi.fn();
const deleteAsync = vi.fn();

function setCreate(overrides: Record<string, unknown> = {}) {
    vi.mocked(useCreateProject).mockReturnValue({
        isPending: false, isError: false, error: null,
        mutateAsync: createAsync, ...overrides,
    } as unknown as ReturnType<typeof useCreateProject>);
}
function setDelete(overrides: Record<string, unknown> = {}) {
    vi.mocked(useDeleteProject).mockReturnValue({
        isPending: false, isError: false, error: null,
        mutateAsync: deleteAsync, ...overrides,
    } as unknown as ReturnType<typeof useDeleteProject>);
}
function DeleteProjectTestApp() {
    return (
        <MemoryRouter initialEntries={["/projects/project-1/settings"]}>
            <Routes>
                <Route path="/projects/:projectId/settings" element={
                    <DeleteProjectDialog projectId="project-1" projectName="DevFlow Launch" />
                } />
                <Route path="/projects" element={<p>Projects destination</p>} />
            </Routes>
        </MemoryRouter>
    );
}

function renderDelete() {
    return render(<DeleteProjectTestApp />);
}

beforeEach(() => {
    vi.resetAllMocks();
    createAsync.mockResolvedValue({ success: true });
    deleteAsync.mockResolvedValue({ success: true });
    setCreate();
    setDelete();
});

describe("CreateProjectDialog lifecycle", () => {
    it("opens from its own trigger and submits the real form", async () => {
        const user = userEvent.setup();
        render(<CreateProjectDialog />);
        await user.click(screen.getByRole("button", { name: "New Project" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByRole("heading", { name: "Create Project" })).toBeInTheDocument();
        await user.type(within(dialog).getByPlaceholderText("Enter project name"), "Quality Board");
        await user.type(within(dialog).getByPlaceholderText("Describe your project"), "Release tests");
        await user.click(within(dialog).getByRole("button", { name: "Create Project" }));
        await waitFor(() => expect(createAsync).toHaveBeenCalledWith({
            name: "Quality Board", description: "Release tests",
        }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("uses the controlled open state and reports a successful close", async () => {
        const change = vi.fn();
        const user = userEvent.setup();
        render(<CreateProjectDialog open onOpenChange={change} />);
        expect(screen.queryByRole("button", { name: "New Project" })).not.toBeInTheDocument();
        await user.type(screen.getByPlaceholderText("Enter project name"), "Sprint Goals");
        await user.click(screen.getByRole("button", { name: "Create Project" }));
        await waitFor(() => expect(change).toHaveBeenCalledWith(false));
    });

    it("shows the mutation error and keeps the dialog open on failure", async () => {
        createAsync.mockRejectedValue(new Error("Network unavailable"));
        setCreate({ isError: true, error: new Error("Network unavailable") });
        const user = userEvent.setup();
        render(<CreateProjectDialog open />);
        expect(screen.getByRole("alert")).toHaveTextContent("Network unavailable");
        await user.type(screen.getByPlaceholderText("Enter project name"), "Roadmap");
        await user.click(screen.getByRole("button", { name: "Create Project" }));
        await waitFor(() => expect(createAsync).toHaveBeenCalledOnce());
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("blocks dismissal and form interactions while creation is pending", async () => {
        setCreate({ isPending: true });
        const change = vi.fn();
        const user = userEvent.setup();
        render(<CreateProjectDialog open onOpenChange={change} />);
        expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
        expect(screen.getByPlaceholderText("Enter project name")).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Close" }));
        expect(change).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
});

describe("DeleteProjectDialog lifecycle", () => {
    it("cancels a destructive operation without calling the API", async () => {
        const user = userEvent.setup();
        renderDelete();
        await user.click(screen.getByRole("button", { name: "Delete Project" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("DevFlow Launch")).toBeInTheDocument();
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(deleteAsync).not.toHaveBeenCalled();
    });

    it("deletes the selected project and navigates back to the project list", async () => {
        const user = userEvent.setup();
        renderDelete();
        await user.click(screen.getByRole("button", { name: "Delete Project" }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete Project" }));
        await waitFor(() => expect(deleteAsync).toHaveBeenCalledWith("project-1"));
        expect(await screen.findByText("Projects destination")).toBeInTheDocument();
    });

    it("renders deletion failures without navigating away", async () => {
        deleteAsync.mockRejectedValue(new Error("Cannot delete project"));
        setDelete({ isError: true, error: new Error("Cannot delete project") });
        const user = userEvent.setup();
        renderDelete();
        await user.click(screen.getByRole("button", { name: "Delete Project" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Cannot delete project");
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete Project" }));
        await waitFor(() => expect(deleteAsync).toHaveBeenCalledOnce());
        expect(screen.queryByText("Projects destination")).not.toBeInTheDocument();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("disables cancellation and confirmation while deletion is in progress", async () => {
        const user = userEvent.setup();
        const { rerender } = renderDelete();
        await user.click(screen.getByRole("button", { name: "Delete Project" }));
        expect(await screen.findByRole("dialog")).toBeInTheDocument();

        // The dialog can open only before deletion enters the pending state.
        setDelete({ isPending: true });
        rerender(<DeleteProjectTestApp />);

        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
        expect(within(dialog).getByRole("button", { name: "Deleting..." })).toBeDisabled();
        expect(deleteAsync).not.toHaveBeenCalled();
    });
});
