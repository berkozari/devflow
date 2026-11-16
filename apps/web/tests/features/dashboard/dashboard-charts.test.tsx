import type { PropsWithChildren } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Recharts' SVG measurement cannot run meaningfully in jsdom. Preserve chart
// composition while exposing transformed chart data to assertion code.
vi.mock("recharts", () => {
    function PassThrough({ children }: PropsWithChildren) {
        return <div>{children}</div>;
    }
    function NoOp() { return null; }
    function BarChart({ children, data }: PropsWithChildren<{ data: unknown }>) {
        return <div data-testid="bar-chart" data-series={JSON.stringify(data)}>{children}</div>;
    }
    function Pie({ children, data }: PropsWithChildren<{ data: unknown }>) {
        return <div data-testid="pie-chart" data-series={JSON.stringify(data)}>{children}</div>;
    }
    return {
        ResponsiveContainer: PassThrough,
        BarChart,
        Pie,
        PieChart: PassThrough,
        Bar: NoOp,
        Cell: NoOp,
        XAxis: NoOp,
        YAxis: NoOp,
        CartesianGrid: NoOp,
        Tooltip: NoOp,
        Legend: NoOp,
    };
});

import { ProjectProgressChart } from "@/features/dashboard/components/ProjectProgressChart";
import { TaskCompletionChart } from "@/features/dashboard/components/TaskCompletionChart";
import { makeOverview } from "./fixtures";

describe("Dashboard charts", () => {
    it("shows the no-project empty state", () => {
        render(<ProjectProgressChart projects={[]} />);
        expect(screen.getByText("No project data available.")).toBeInTheDocument();
        expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    });

    it("maps each project's progress to Recharts data without losing counts", () => {
        const projects = makeOverview().projectProgress;
        render(<ProjectProgressChart projects={projects} />);
        const chartData = JSON.parse(screen.getByTestId("bar-chart").getAttribute("data-series")!);
        expect(chartData).toEqual([{
            name: "Alpha", completionRate: 60, completedTasks: 6, totalTasks: 10,
        }]);
    });

    it("renders the no-task empty state even if status entries have zero counts", () => {
        render(<TaskCompletionChart tasksByStatus={[{ status: "TODO", _count: { _all: 0 } }]} />);
        expect(screen.getByText("No task data available")).toBeInTheDocument();
        expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();
    });

    it("formats task statuses, total count and percentage breakdown", () => {
        render(<TaskCompletionChart tasksByStatus={[
            { status: "IN_PROGRESS", _count: { _all: 2 } },
            { status: "DONE", _count: { _all: 3 } },
        ]} />);
        const chartData = JSON.parse(screen.getByTestId("pie-chart").getAttribute("data-series")!);
        expect(chartData).toEqual([
            { name: "In Progress", value: 2 },
            { name: "Done", value: 3 },
        ]);
        expect(screen.getByText("Total Tasks").previousElementSibling).toHaveTextContent("5");
        expect(screen.getByText(/2 \(40\.0%\)/)).toBeInTheDocument();
        expect(screen.getByText(/3 \(60\.0%\)/)).toBeInTheDocument();
    });
});
