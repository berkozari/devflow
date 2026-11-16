import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskFilters } from "@/features/tasks/components/TaskFilters";
import { makeMember } from "../projects/fixtures";

afterEach(() => { vi.useRealTimers(); });

describe("Tasks: interactive filtering", () => {
    it("changes status, resets page and preserves other filters", async () => {
        const onChange = vi.fn();
        render(<TaskFilters filters={{ priority: "HIGH", page: 5, limit: 20 }} onChange={onChange} members={[]} />);
        await userEvent.setup().selectOptions(screen.getAllByRole("combobox")[0]!, "TODO");
        expect(onChange).toHaveBeenCalledWith({ priority: "HIGH", status: "TODO", page: 1, limit: 20 });
    });

    it("selects an assignee using the project member ID", async () => {
        const onChange = vi.fn();
        render(<TaskFilters filters={{ page: 3 }} onChange={onChange} members={[makeMember("MEMBER", "member-1")]} />);
        await userEvent.setup().selectOptions(screen.getAllByRole("combobox")[2]!, "member-1");
        expect(onChange).toHaveBeenCalledWith({ page: 1, assigneeId: "member-1" });
    });

    it("debounces and trims the search term, resetting pagination", () => {
        vi.useFakeTimers();
        const onChange = vi.fn();
        render(<TaskFilters filters={{ page: 3, limit: 25 }} onChange={onChange} members={[]} />);
        fireEvent.change(screen.getByPlaceholderText("Search tasks..."), { target: { value: "  api   " } });
        act(() => { vi.advanceTimersByTime(399); });
        expect(onChange).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(1); });
        expect(onChange).toHaveBeenCalledWith({ page: 1, limit: 25, search: "api" });
    });

    it("synchronizes the input after an external filter reset", () => {
        const onChange = vi.fn();
        const { rerender } = render(<TaskFilters filters={{ search: "before", page: 2 }} onChange={onChange} members={[]} />);
        expect(screen.getByPlaceholderText("Search tasks...")).toHaveValue("before");
        rerender(<TaskFilters filters={{ page: 1 }} onChange={onChange} members={[]} />);
        expect(screen.getByPlaceholderText("Search tasks...")).toHaveValue("");
    });

    it("clears active filters but retains the page size", async () => {
        const onChange = vi.fn();
        render(<TaskFilters filters={{ search: "old", status: "DONE", priority: "HIGH", page: 9, limit: 40 }} onChange={onChange} members={[]} />);
        await userEvent.setup().click(screen.getByRole("button", { name: /clear/i }));
        expect(onChange).toHaveBeenCalledWith({ page: 1, limit: 40 });
        expect(screen.getByPlaceholderText("Search tasks...")).toHaveValue("");
    });

    it("does not display Clear when no filters are active", () => {
        render(<TaskFilters filters={{ page: 1, limit: 100 }} onChange={vi.fn()} members={[]} />);
        expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
    });
});
