import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/features/projects/hooks/useProject", () => ({ useProject: vi.fn() }));
vi.mock("@/features/projects/hooks/useUpdateProject", () => ({ useUpdateProject: vi.fn() }));
vi.mock("@/features/auth/hooks/useCurrentUser", () => ({ useCurrentUser: vi.fn() }));
vi.mock("@/features/projects/components/ProjectSettingsForm", () => ({
    ProjectSettingsForm: ({ canEdit, onSubmit }: {
        canEdit: boolean;
        onSubmit: (data: { name: string; description: string; status: "ACTIVE" }) => Promise<void>;
    }) => <div>
        <span data-testid="form-access">{canEdit ? "edit" : "read-only"}</span>
        <button disabled={!canEdit} onClick={() => void onSubmit({
            name: "Updated", description: "Notes", status: "ACTIVE",
        })}>Save mocked form</button>
    </div>,
}));
vi.mock("@/features/projects/components/DeleteProjectDialog", () => ({
    DeleteProjectDialog: ({ projectName }: { projectName: string }) =>
        <p>Delete project dialog: {projectName}</p>,
}));

import { ProjectSettingsPage } from "@/pages/projects/ProjectSettingsPage";
import { useProject } from "@/features/projects/hooks/useProject";
import { useUpdateProject } from "@/features/projects/hooks/useUpdateProject";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { adminId, makeProjectDetail, memberId, ownerId } from "./fixtures";

const mutateAsync = vi.fn();
function user(id: string) { return { id, name: "User", email: "user@example.com" }; }
function mockQueries(userId = ownerId) {
    vi.mocked(useProject).mockReturnValue({
        isPending: false, isError: false,
        data: { success: true, data: makeProjectDetail() },
    } as unknown as ReturnType<typeof useProject>);
    vi.mocked(useCurrentUser).mockReturnValue({
        isPending: false, isError: false, data: user(userId),
    } as unknown as ReturnType<typeof useCurrentUser>);
    vi.mocked(useUpdateProject).mockReturnValue({
        isPending: false, isError: false, mutateAsync,
    } as unknown as ReturnType<typeof useUpdateProject>);
}
function renderPage() {
    return render(<MemoryRouter initialEntries={["/projects/project-1/settings"]}>
        <Routes>
            <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
            <Route path="/projects/:projectId" element={<p data-testid="details-destination">Details page</p>} />
        </Routes>
    </MemoryRouter>);
}

beforeEach(() => {
    vi.resetAllMocks();
    mutateAsync.mockResolvedValue({ success: true });
    mockQueries();
});

describe("ProjectSettingsPage: permissions and states", () => {
    it("shows loading placeholders while the current user is loading", () => {
        vi.mocked(useCurrentUser).mockReturnValue({ isPending: true } as unknown as ReturnType<typeof useCurrentUser>);
        const { container } = renderPage();
        expect(container.querySelector(".animate-pulse")).not.toBeNull();
    });
    it("shows the error state when project details cannot load", () => {
        vi.mocked(useProject).mockReturnValue({ isPending: false, isError: true } as unknown as ReturnType<typeof useProject>);
        renderPage();
        expect(screen.getByText("Unable to load project settings")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to Projects" })).toHaveAttribute("href", "/projects");
    });
    it("allows OWNER to edit and displays the danger zone", () => {
        renderPage();
        expect(screen.getByTestId("form-access")).toHaveTextContent("edit");
        expect(screen.getByText("Danger Zone")).toBeInTheDocument();
        expect(screen.getByText(/Delete project dialog:/)).toBeInTheDocument();
    });
    it("allows ADMIN to edit without granting deletion", () => {
        mockQueries(adminId);
        renderPage();
        expect(screen.getByTestId("form-access")).toHaveTextContent("edit");
        expect(screen.queryByText("Danger Zone")).not.toBeInTheDocument();
    });
    it("renders a read-only form for a MEMBER", () => {
        mockQueries(memberId);
        renderPage();
        expect(screen.getByTestId("form-access")).toHaveTextContent("read-only");
        expect(screen.getByText("You have read-only access to this project.")).toBeInTheDocument();
        expect(screen.queryByText("Danger Zone")).not.toBeInTheDocument();
    });
    it("submits project updates and navigates to the project", async () => {
        renderPage();
        await userEvent.setup().click(screen.getByRole("button", { name: "Save mocked form" }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
            id: "project-1", data: { name: "Updated", description: "Notes", status: "ACTIVE" },
        }));
        expect(await screen.findByTestId("details-destination")).toBeInTheDocument();
    });
    it("displays a mutation error from the update hook", () => {
        vi.mocked(useUpdateProject).mockReturnValue({
            isPending: false, isError: true, error: new Error("Cannot update"), mutateAsync,
        } as unknown as ReturnType<typeof useUpdateProject>);
        renderPage();
        expect(screen.getByRole("alert")).toHaveTextContent("Cannot update");
    });
});
