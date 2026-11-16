import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverdueTasks } from "@/features/dashboard/components/OverdueTasks";
import { RecentActivities } from "@/features/dashboard/components/RecentActivities";
import { makeActivity, makeOverdueTask } from "./fixtures";

describe("Dashboard overdue tasks", () => {
    it("shows an empty state", () => {
        render(<OverdueTasks tasks={[]} />);
        expect(screen.getByText("No overdue tasks")).toBeInTheDocument();
    });

    it("renders priority, project, assigned user and overdue duration", () => {
        render(<OverdueTasks tasks={[makeOverdueTask()]} />);
        expect(screen.getByText("Fix release bug")).toBeInTheDocument();
        expect(screen.getByText("HIGH")).toBeInTheDocument();
        expect(screen.getByText("Alpha")).toBeInTheDocument();
        expect(screen.getByText("Ada")).toBeInTheDocument();
        expect(screen.getByText(/days overdue/)).toBeInTheDocument();
    });

    it("supports missing assignee, unknown priority, invalid date and item limit", () => {
        const tasks = [
            makeOverdueTask({ id: "a", title: "Visible", priority: "OTHER", dueDate: "invalid", assignee: null }),
            makeOverdueTask({ id: "b", title: "Hidden" }),
        ];
        render(<OverdueTasks tasks={tasks} limit={1} />);
        expect(screen.getByText("Visible")).toBeInTheDocument();
        expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
        expect(screen.getByText("OTHER")).toBeInTheDocument();
        expect(screen.getByText("Unassigned")).toBeInTheDocument();
        expect(screen.getByText("Unknown date")).toBeInTheDocument();
        expect(screen.getByText("(0 days overdue)")).toBeInTheDocument();
    });
});

describe("Dashboard recent activities", () => {
    it("renders an empty state", () => {
        render(<RecentActivities activities={[]} />);
        expect(screen.getByText("No recent activities found.")).toBeInTheDocument();
    });

    it("formats known actions and includes task, actor, project and date", () => {
        render(<RecentActivities activities={[makeActivity()]} />);
        expect(screen.getByText("Ada")).toBeInTheDocument();
        expect(screen.getByText("created a task")).toBeInTheDocument();
        expect(screen.getByText("Fix release bug")).toBeInTheDocument();
        expect(screen.getByText("Alpha")).toBeInTheDocument();
        expect(screen.getByText(new Intl.DateTimeFormat("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        }).format(new Date("2026-10-20T09:00:00.000Z")))).toBeInTheDocument();
    });

    it("handles unknown actor, custom action, invalid time and item limit", () => {
        const events = [
            makeActivity({ id: "a", actor: null, action: "CUSTOM_ACTION", task: null, createdAt: "not-a-date" }),
            makeActivity({ id: "b", action: "PROJECT_DELETED" }),
        ];
        render(<RecentActivities activities={events} limit={1} />);
        expect(screen.getByText("Unknown user")).toBeInTheDocument();
        expect(screen.getByText("custom action")).toBeInTheDocument();
        expect(screen.getByText("Unknown date")).toBeInTheDocument();
        expect(screen.queryByText("deleted a project")).not.toBeInTheDocument();
    });
});
