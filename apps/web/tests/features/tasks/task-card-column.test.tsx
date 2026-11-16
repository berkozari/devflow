import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskCard } from "@/features/tasks/components/TaskCard";
import { KanbanColumn } from "@/features/tasks/components/KanbanColumn";
import { makeTask } from "./fixtures";

const dnd = vi.hoisted(() => ({ useDraggable: vi.fn(), useDroppable: vi.fn() }));
vi.mock("@dnd-kit/core", () => ({ useDraggable: dnd.useDraggable, useDroppable: dnd.useDroppable }));

beforeEach(() => {
    dnd.useDraggable.mockReturnValue({
        attributes: {}, listeners: {}, setNodeRef: vi.fn(), setActivatorNodeRef: vi.fn(),
        transform: null, isDragging: false,
    });
    dnd.useDroppable.mockReturnValue({ setNodeRef: vi.fn(), isOver: false });
});

describe("Tasks: task card", () => {
    it("renders priority, assignee and description", () => {
        render(<TaskCard task={makeTask()} />);
        expect(screen.getByText("Review API changes")).toBeInTheDocument();
        expect(screen.getByText("Check the integration tests")).toBeInTheDocument();
        expect(screen.getByText("High")).toBeInTheDocument();
        expect(screen.getByText("Project Member")).toBeInTheDocument();
    });

    it("shows Unassigned and a due date when no assignee exists", () => {
        render(<TaskCard task={makeTask({ assigneeId: null, assignee: null, dueDate: "2026-11-20T12:00:00.000Z" })} />);
        expect(screen.getByText("Unassigned")).toBeInTheDocument();
        expect(screen.getByText(/Nov 20, 2026/)).toBeInTheDocument();
    });

    it("signals an overdue task using its supplied clock", () => {
        const now = Date.parse("2026-12-01T00:00:00.000Z");
        render(<TaskCard task={makeTask({ dueDate: "2026-11-20T12:00:00.000Z" })} now={now} />);
        expect(screen.getByText(/Nov 20, 2026/).className).toContain("text-destructive");
    });

    it("calls the task click handler", async () => {
        const onClick = vi.fn();
        const task = makeTask();
        render(<TaskCard task={task} onClick={onClick} />);
        await userEvent.setup().click(screen.getByText(task.title));
        expect(onClick).toHaveBeenCalledWith(task);
    });

    it("shows a drag handle only when the task can be dragged", () => {
        const task = makeTask();
        const { rerender } = render(<TaskCard task={task} canDrag />);
        expect(screen.getByRole("button", { name: `Drag task: ${task.title}` })).toBeInTheDocument();
        expect(dnd.useDraggable).toHaveBeenCalledWith({ id: task.id, disabled: false });
        rerender(<TaskCard task={task} canDrag={false} />);
        expect(screen.queryByRole("button", { name: /drag task:/i })).not.toBeInTheDocument();
        expect(dnd.useDraggable).toHaveBeenLastCalledWith({ id: task.id, disabled: true });
    });

    it("does not open a task while the drag is active", () => {
        dnd.useDraggable.mockReturnValue({
            attributes: {}, listeners: {}, setNodeRef: vi.fn(), setActivatorNodeRef: vi.fn(),
            transform: { x: 10, y: 0 }, isDragging: true,
        });
        const onClick = vi.fn();
        render(<TaskCard task={makeTask()} onClick={onClick} canDrag />);
        fireEvent.click(screen.getByText("Review API changes"));
        expect(onClick).not.toHaveBeenCalled();
    });
});

describe("Tasks: Kanban column", () => {
    it("renders the column count and incoming task order", () => {
        const later = makeTask({ id: "later", title: "Later", position: 2 });
        const earlier = makeTask({ id: "earlier", title: "Earlier", position: 1 });
        const { container } = render(<KanbanColumn title="To Do" status="TODO" tasks={[later, earlier]} />);
        const names = Array.from(container.querySelectorAll("[data-slot='card'] h3")).map((element) => element.textContent);
        expect(names).toEqual(["Later", "Earlier"]); // KanbanBoard, not the column, is responsible for sorting.
        expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("renders the empty state and hides add controls without permission", () => {
        render(<KanbanColumn title="Done" status="DONE" tasks={[]} canAddTask={false} />);
        expect(screen.getByText("No tasks yet")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Add task to Done" })).not.toBeInTheDocument();
    });

    it("allows adding a task to the current column", async () => {
        const onAddTask = vi.fn();
        render(<KanbanColumn title="Done" status="DONE" tasks={[]} onAddTask={onAddTask} />);
        await userEvent.setup().click(screen.getByRole("button", { name: "Add task to Done" }));
        expect(onAddTask).toHaveBeenCalledWith("DONE");
    });

    it("disables adding and dragging while moving", () => {
        render(<KanbanColumn title="To Do" status="TODO" tasks={[makeTask()]} disabled canDrag />);
        expect(screen.getByRole("button", { name: "Add task to To Do" })).toBeDisabled();
        expect(dnd.useDroppable).toHaveBeenCalledWith({ id: "TODO", disabled: true });
        expect(screen.queryByRole("button", { name: /drag task/i })).not.toBeInTheDocument();
    });

    it("only enables dragging when the permission predicate allows it", () => {
        render(<KanbanColumn title="To Do" status="TODO" tasks={[makeTask()]} canDrag canDragTask={() => false} />);
        expect(screen.queryByRole("button", { name: /drag task/i })).not.toBeInTheDocument();
    });
});
