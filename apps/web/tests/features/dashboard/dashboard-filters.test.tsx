import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardFilters } from "@/features/dashboard/components/DashboardFilters";
import type { DashboardFilters as FilterValues } from "@/features/dashboard/types/dashboard.types";

const projects = [
    { id: "p1", name: "Alpha" },
    { id: "p2", name: "Beta" },
];

function setup(filters: FilterValues = {}) {
    const onChange = vi.fn<(filters: FilterValues) => void>();
    const view = render(<DashboardFilters filters={filters} projects={projects} onChange={onChange} />);
    return { onChange, ...view };
}

describe("Dashboard date and project filters", () => {
    it("shows project choices and the default all-time preset", () => {
        setup();
        expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue("");
        expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Beta" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "All time" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.queryByLabelText("Start date")).not.toBeInTheDocument();
    });

    it("filters by a project without losing existing dates", async () => {
        const filters = { startDate: "2026-10-01T00:00:00.000Z" };
        const { onChange } = setup(filters);
        await userEvent.setup().selectOptions(screen.getByRole("combobox", { name: "Project" }), "p2");
        expect(onChange).toHaveBeenLastCalledWith({ ...filters, projectId: "p2" });
    });

    it("removes the project filter when selecting All projects", async () => {
        const { onChange } = setup({ projectId: "p1" });
        await userEvent.setup().selectOptions(screen.getByRole("combobox", { name: "Project" }), "");
        expect(onChange).toHaveBeenLastCalledWith({ projectId: undefined });
    });

    it.each([7, 30, 90] as const)("creates a valid inclusive last-%d-days range", async (days) => {
        const { onChange } = setup({ projectId: "p1" });
        await userEvent.setup().click(screen.getByRole("button", { name: `Last ${days} days` }));
        const received = onChange.mock.lastCall?.[0];
        expect(received?.projectId).toBe("p1");
        expect(received?.startDate).toBeDefined();
        expect(received?.endDate).toBeDefined();
        const start = new Date(received!.startDate!);
        const end = new Date(received!.endDate!);
        expect(start.getHours()).toBe(0);
        expect(start.getMinutes()).toBe(0);
        expect(end.getHours()).toBe(23);
        expect(end.getMinutes()).toBe(59);
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        expect(Math.round((endDay.getTime() - startDay.getTime()) / 86_400_000)).toBe(days - 1);
    });

    it("opens custom date inputs and converts their local day bounds into ISO timestamps", async () => {
        const { onChange } = setup({ projectId: "p1" });
        await userEvent.setup().click(screen.getByRole("button", { name: "Custom" }));
        expect(screen.getByRole("button", { name: "Custom" })).toHaveAttribute("aria-pressed", "true");
        fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-10-10" } });
        expect(onChange).toHaveBeenLastCalledWith({
            projectId: "p1",
            startDate: new Date("2026-10-10T00:00:00").toISOString(),
        });
        fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-10-20" } });
        expect(onChange).toHaveBeenLastCalledWith({
            projectId: "p1",
            endDate: new Date("2026-10-20T23:59:59.999").toISOString(),
        });
    });

    it("shows existing date inputs, constrains allowed dates, and clears a date", () => {
        const { onChange } = setup({
            startDate: "2026-10-01T00:00:00.000Z",
            endDate: "2026-10-31T23:59:59.999Z",
        });
        expect(screen.getByLabelText("Start date")).toHaveAttribute("max", "2026-10-31");
        expect(screen.getByLabelText("End date")).toHaveAttribute("min", "2026-10-01");
        fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "" } });
        expect(onChange).toHaveBeenCalledWith({
            startDate: undefined,
            endDate: "2026-10-31T23:59:59.999Z",
        });
    });

    it("all-time retains the project while Clear filters removes everything", async () => {
        const { onChange } = setup({ projectId: "p1", startDate: "2026-10-01T00:00:00Z" });
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "All time" }));
        expect(onChange).toHaveBeenCalledWith({ projectId: "p1" });
        await user.click(screen.getByRole("button", { name: "Clear filters" }));
        expect(onChange).toHaveBeenLastCalledWith({});
    });
});
