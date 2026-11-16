import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeActivity, makeOverdueTask, makeOverview, makeWorkload } from "./fixtures";

const dashboard = vi.hoisted(() => ({ useDashboard: vi.fn() }));
vi.mock("@/features/dashboard/hooks/useDashboard", () => ({ useDashboard: dashboard.useDashboard }));

// Chart SVG geometry is not part of the page-level contract (covered separately).
vi.mock("@/features/dashboard/components/TaskCompletionChart", () => ({
    TaskCompletionChart: ({ tasksByStatus }: { tasksByStatus: unknown[] }) =>
        <div data-testid="task-chart">{tasksByStatus.length} statuses</div>,
}));
vi.mock("@/features/dashboard/components/ProjectProgressChart", () => ({
    ProjectProgressChart: ({ projects }: { projects: unknown[] }) =>
        <div data-testid="project-chart">{projects.length} projects</div>,
}));

import { DashboardPage } from "@/pages/dashboard/DashboardPage";

const refetch = vi.fn();
const success = () => ({
    overview: makeOverview(),
    overdueTasks: [makeOverdueTask()],
    workload: [makeWorkload()],
    activities: [makeActivity()],
    isLoading: false,
    isError: false,
    error: null,
    refetch,
});

beforeEach(() => {
    vi.resetAllMocks();
    dashboard.useDashboard.mockImplementation(success);
});

describe("Dashboard page", () => {
    it("renders a skeleton without showing partial data while loading", () => {
        dashboard.useDashboard.mockReturnValue({ ...success(), overview: undefined, isLoading: true });
        const { container } = render(<DashboardPage />);
        expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
        expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
    });

    it("renders error and provides a working retry button", () => {
        dashboard.useDashboard.mockReturnValue({ ...success(), isError: true });
        render(<DashboardPage />);
        expect(screen.getByRole("heading", { name: "Failed to load dashboard" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Try again" }));
        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("treats a missing overview as an error instead of a successful empty dashboard", () => {
        dashboard.useDashboard.mockReturnValue({ ...success(), overview: undefined });
        render(<DashboardPage />);
        expect(screen.getByText("Failed to load dashboard")).toBeInTheDocument();
    });

    it("renders statistics, lists, workload and both chart sections", () => {
        render(<DashboardPage />);
        expect(dashboard.useDashboard).toHaveBeenCalledWith({});
        expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.getByText("Total Projects")).toBeInTheDocument();
        expect(screen.getAllByText("Fix release bug")).toHaveLength(2);
        expect(screen.getByText("Recent Activities")).toBeInTheDocument();
        expect(screen.getByText("User Workload")).toBeInTheDocument();
        expect(screen.getByTestId("task-chart")).toHaveTextContent("2 statuses");
        expect(screen.getByTestId("project-chart")).toHaveTextContent("1 projects");
        expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
    });

    it("connects the selected project to useDashboard and resets it", () => {
        render(<DashboardPage />);
        fireEvent.change(screen.getByRole("combobox", { name: "Project" }), { target: { value: "project-1" } });
        expect(dashboard.useDashboard).toHaveBeenLastCalledWith({ projectId: "project-1" });
        fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
        expect(dashboard.useDashboard).toHaveBeenLastCalledWith({});
    });

    it("passes a date range to the query hook when a preset is selected", () => {
        render(<DashboardPage />);
        fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
        const filters = dashboard.useDashboard.mock.lastCall?.[0] as { startDate?: string; endDate?: string };
        expect(filters.startDate).toBeDefined();
        expect(filters.endDate).toBeDefined();
        expect(new Date(filters.endDate!).getTime()).toBeGreaterThan(new Date(filters.startDate!).getTime());
    });
});
