import type { PropsWithChildren } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskDetailDrawer } from "@/features/tasks/components/TaskDetailDrawer";
import { makeTask } from "./fixtures";

vi.mock("@/components/ui/sheet", () => {
    const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
    return {
        Sheet: ({ open, children }: PropsWithChildren<{ open: boolean }>) => open ? <div>{children}</div> : null,
        SheetContent: Container, SheetDescription: Container, SheetHeader: Container, SheetTitle: Container,
    };
});

const required = { onOpenChange: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };

describe("Tasks: detail drawer permissions", () => {
    it("renders nothing when no task is selected", () => {
        const { container } = render(<TaskDetailDrawer task={null} open {...required} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("displays status, priority, description and assigned user", () => {
        render(<TaskDetailDrawer task={makeTask()} open {...required} />);
        expect(screen.getByText("Review API changes")).toBeInTheDocument();
        expect(screen.getByText("To Do")).toBeInTheDocument();
        expect(screen.getByText("HIGH")).toBeInTheDocument();
        expect(screen.getByText("Check the integration tests")).toBeInTheDocument();
        expect(screen.getByText("Project Member")).toBeInTheDocument();
        expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    });

    it("displays fallbacks for an unassigned task", () => {
        render(<TaskDetailDrawer task={makeTask({ description: null, assigneeId: null, assignee: null })} open {...required} />);
        expect(screen.getByText("No description provided.")).toBeInTheDocument();
        expect(screen.getByText("Unassigned")).toBeInTheDocument();
        expect(screen.getByText("No due date")).toBeInTheDocument();
    });

    it("hides editing and deletion for read-only users", () => {
        render(<TaskDetailDrawer task={makeTask()} open {...required} canEdit={false} canDelete={false} />);
        expect(screen.queryByRole("button", { name: "Edit task" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    });

    it("exposes only edit when delete permission is absent", async () => {
        const onEdit = vi.fn();
        const task = makeTask();
        render(<TaskDetailDrawer task={task} open {...required} onEdit={onEdit} canEdit />);
        expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Edit task" }));
        expect(onEdit).toHaveBeenCalledWith(task);
    });

    it("calls the delete handler only when deletion is permitted", async () => {
        const onDelete = vi.fn();
        const task = makeTask();
        render(<TaskDetailDrawer task={task} open {...required} onDelete={onDelete} canDelete />);
        expect(screen.queryByRole("button", { name: "Edit task" })).not.toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Delete" }));
        expect(onDelete).toHaveBeenCalledWith(task);
    });
});
