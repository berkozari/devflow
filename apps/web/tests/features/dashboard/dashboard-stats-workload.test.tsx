import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectStats } from "@/features/dashboard/components/ProjectStats";
import { UserWorkload } from "@/features/dashboard/components/UserWorkload";
import { makeOverview, makeWorkload } from "./fixtures";

describe("Dashboard statistics", () => {
    it("shows six cards with calculated descriptions and a bounded completion bar", () => {
        render(<ProjectStats statistics={makeOverview().statistics} />);
        for (const label of ["Total Projects", "Completed Projects", "Total Tasks", "Completed Tasks", "Overdue Tasks", "Completion Rate"]) {
            expect(screen.getByText(label)).toBeInTheDocument();
        }
        expect(screen.getByText("2 active projects")).toBeInTheDocument();
        expect(screen.getByText("1 unassigned")).toBeInTheDocument();
        expect(screen.getByText("60%")).toBeInTheDocument();
        expect(screen.getByRole("progressbar", { name: "Task completion rate" })).toHaveAttribute("aria-valuenow", "60");
    });

    it("clamps the accessible progress meter when statistics exceed bounds", () => {
        const stats = makeOverview().statistics;
        const { rerender } = render(<ProjectStats statistics={{ ...stats, completionRate: 130 }} />);
        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
        rerender(<ProjectStats statistics={{ ...stats, completionRate: -10 }} />);
        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    });
});

describe("Dashboard user workload", () => {
    it("renders empty state when nobody has tasks", () => {
        render(<UserWorkload workload={[]} />);
        expect(screen.getByText("No workload data")).toBeInTheDocument();
    });

    it("sorts descending, respects limit and keeps total count across hidden users", () => {
        const workload = [
            makeWorkload({ user: { id: "a", name: "Ada", email: "a@example.com" }, totalTasks: 2 }),
            makeWorkload({ user: { id: "b", name: "Grace", email: "b@example.com" }, totalTasks: 8 }),
            makeWorkload({ user: { id: "c", name: "Lin", email: "c@example.com" }, totalTasks: 5 }),
        ];
        render(<UserWorkload workload={workload} limit={2} />);
        expect(screen.getByText("Total assigned tasks").parentElement).toHaveTextContent("15");
        expect(screen.queryByText("Ada")).not.toBeInTheDocument();
        const bars = screen.getAllByRole("progressbar");
        expect(bars).toHaveLength(2);
        expect(bars[0]).toHaveAttribute("aria-label", "Grace task workload");
        expect(bars[0]).toHaveAttribute("aria-valuemax", "8");
        expect(bars[1]).toHaveAttribute("aria-label", "Lin task workload");
        expect(bars[1].firstElementChild).toHaveStyle({ width: "62.5%" });
    });

    it("handles users with zero tasks without division by zero", () => {
        render(<UserWorkload workload={[makeWorkload({ totalTasks: 0 })]} />);
        const bar = screen.getByRole("progressbar", { name: "Ada task workload" });
        expect(bar).toHaveAttribute("aria-valuemax", "0");
        expect(within(bar).queryByRole("progressbar")).not.toBeInTheDocument();
        expect(bar.firstElementChild).toHaveStyle({ width: "0%" });
    });
});
