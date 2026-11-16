import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/features/projects/hooks/useProjects", () => ({ useProjects: vi.fn() }));
import { useProjects } from "@/features/projects/hooks/useProjects";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { ProjectEmptyState } from "@/features/projects/components/ProjectEmptyState";
import { makeProject } from "./fixtures";

const refetch = vi.fn();
function setQuery(overrides: Record<string, unknown>) {
    vi.mocked(useProjects).mockReturnValue({
        isPending: false, isError: false,
        data: { success: true, data: [] },
        error: null, refetch,
        ...overrides,
    } as unknown as ReturnType<typeof useProjects>);
}
function renderInRouter(element: ReactNode) {
    return render(<MemoryRouter>{element}</MemoryRouter>);
}

beforeEach(() => { vi.resetAllMocks(); setQuery({}); });

describe("Projects: cards and list", () => {
    it.each([
        ["PLANNING", "Planning"], ["ACTIVE", "Active"],
        ["COMPLETED", "Completed"], ["ARCHIVED", "Archived"],
    ] as const)("renders %s projects with a link", (status, label) => {
        renderInRouter(<ProjectCard project={makeProject({ status })} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "View project DevFlow Launch" })).toHaveAttribute("href", "/projects/project-1");
        expect(screen.getByText("7 tasks")).toBeInTheDocument();
        expect(screen.getByText("3 members")).toBeInTheDocument();
    });
    it("shows empty description and missing member count fallbacks", () => {
        renderInRouter(<ProjectCard project={makeProject({ description: null, _count: { tasks: 0 } })} />);
        expect(screen.getByText("No description provided.")).toBeInTheDocument();
        expect(screen.getByText("0 members")).toBeInTheDocument();
        expect(screen.getByText("0 tasks")).toBeInTheDocument();
    });
    it("shows a loading skeleton before data arrives", () => {
        setQuery({ isPending: true, data: undefined });
        const { container } = renderInRouter(<ProjectList onCreateProject={vi.fn()} />);
        expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);
    });
    it("shows an API error and retries after a click", async () => {
        setQuery({ isError: true, error: new Error("Unavailable") });
        renderInRouter(<ProjectList onCreateProject={vi.fn()} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Unavailable");
        await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
        expect(refetch).toHaveBeenCalledOnce();
    });
    it("shows the empty state and invokes creation", async () => {
        const onCreate = vi.fn();
        renderInRouter(<ProjectList onCreateProject={onCreate} />);
        expect(screen.getByText("No projects yet")).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Create your first project" }));
        expect(onCreate).toHaveBeenCalledOnce();
    });
    it("renders one card per returned project", () => {
        setQuery({ data: { success: true, data: [makeProject(), makeProject({ id: "project-2", name: "Backlog" })] } });
        renderInRouter(<ProjectList onCreateProject={vi.fn()} />);
        expect(screen.getByRole("link", { name: "View project DevFlow Launch" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "View project Backlog" })).toBeInTheDocument();
    });
    it("renders a standalone empty state", () => {
        render(<ProjectEmptyState onCreateProject={vi.fn()} />);
        expect(screen.getByRole("heading", { name: "No projects yet" })).toBeInTheDocument();
    });
});
