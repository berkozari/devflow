import type { PropsWithChildren } from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeTask } from "./fixtures";

interface DragEventForTest {
    active: { id: string };
    over: { id: string } | null;
}
const handlers = vi.hoisted(() => ({
    start: null as null | ((event: { active: { id: string } }) => void),
    end: null as null | ((event: DragEventForTest) => void),
    cancel: null as null | (() => void),
}));

vi.mock("@dnd-kit/core", () => ({
    DndContext: ({ children, onDragStart, onDragEnd, onDragCancel }: PropsWithChildren<{
        onDragStart: typeof handlers.start;
        onDragEnd: typeof handlers.end;
        onDragCancel: typeof handlers.cancel;
    }>) => {
        handlers.start = onDragStart;
        handlers.end = onDragEnd;
        handlers.cancel = onDragCancel;
        return <div data-testid="dnd-container">{children}</div>;
    },
    DragOverlay: ({ children }: PropsWithChildren) => <div>{children}</div>,
    PointerSensor: class {}, KeyboardSensor: class {},
    useSensor: vi.fn(() => ({})), useSensors: vi.fn(() => []), closestCorners: vi.fn(),
}));
vi.mock("@dnd-kit/sortable", () => ({ sortableKeyboardCoordinates: vi.fn() }));
vi.mock("@/features/tasks/components/KanbanColumn", () => ({
    KanbanColumn: ({ title, status, tasks }: { title: string; status: string; tasks: { id: string; title: string }[] }) =>
        <section data-testid={`column-${status}`}><h2>{title}</h2>{tasks.map((task) => <p key={task.id}>{task.title}</p>)}</section>,
}));
vi.mock("@/features/tasks/components/TaskCard", () => ({
    TaskCard: ({ task }: { task: { title: string } }) => <div data-testid="drag-overlay">{task.title}</div>,
}));

import { KanbanBoard } from "@/features/tasks/components/KanbanBoard";

const first = makeTask();
const second = makeTask({ id: "task-2", title: "Second task", position: 1 });
const inReview = makeTask({ id: "task-3", title: "Review task", status: "IN_REVIEW", position: 0 });
const tasks = [second, inReview, first];

function drag(activeId: string, overId: string | null) {
    act(() => { handlers.end?.({ active: { id: activeId }, over: overId ? { id: overId } : null }); });
}

beforeEach(() => {
    handlers.start = null;
    handlers.end = null;
    handlers.cancel = null;
});

describe("Tasks: Kanban drag-and-drop semantics", () => {
    it("renders four columns with position-sorted tasks", () => {
        render(<KanbanBoard tasks={tasks} onMoveTask={vi.fn()} />);
        const todo = screen.getByTestId("column-TODO");
        expect(todo.textContent).toContain("Review API changesSecond task");
        expect(screen.getByTestId("column-IN_PROGRESS")).toBeInTheDocument();
        expect(screen.getByTestId("column-IN_REVIEW")).toBeInTheDocument();
        expect(screen.getByTestId("column-DONE")).toBeInTheDocument();
    });

    it("moves a task onto a new column with no before-task ID", () => {
        const onMoveTask = vi.fn();
        render(<KanbanBoard tasks={tasks} onMoveTask={onMoveTask} canDrag />);
        drag(first.id, "DONE");
        expect(onMoveTask).toHaveBeenCalledWith(first.id, "DONE", null);
    });

    it("moves a task before an existing task in a different column", () => {
        const onMoveTask = vi.fn();
        render(<KanbanBoard tasks={tasks} onMoveTask={onMoveTask} canDrag />);
        drag(first.id, inReview.id);
        expect(onMoveTask).toHaveBeenCalledWith(first.id, "IN_REVIEW", inReview.id);
    });

    it("reorders tasks within the same column", () => {
        const onMoveTask = vi.fn();
        render(<KanbanBoard tasks={tasks} onMoveTask={onMoveTask} canDrag />);
        drag(second.id, first.id);
        expect(onMoveTask).toHaveBeenCalledWith(second.id, "TODO", first.id);
    });

    it("skips a no-op move in the same position", () => {
        const onMoveTask = vi.fn();
        render(<KanbanBoard tasks={tasks} onMoveTask={onMoveTask} canDrag />);
        drag(first.id, second.id);
        expect(onMoveTask).not.toHaveBeenCalled();
    });

    it("skips drops without a target or onto the dragged task itself", () => {
        const onMoveTask = vi.fn();
        render(<KanbanBoard tasks={tasks} onMoveTask={onMoveTask} canDrag />);
        drag(first.id, null);
        drag(first.id, first.id);
        expect(onMoveTask).not.toHaveBeenCalled();
    });

    it("prevents moving when drag is disabled or a save is in progress", () => {
        const onMoveTask = vi.fn();
        const { rerender } = render(<KanbanBoard tasks={tasks} onMoveTask={onMoveTask} />);
        drag(first.id, "DONE");
        rerender(<KanbanBoard tasks={tasks} onMoveTask={onMoveTask} canDrag isMoving />);
        drag(first.id, "DONE");
        expect(onMoveTask).not.toHaveBeenCalled();
    });

    it("prevents moving when task-level permissions deny it", () => {
        const onMoveTask = vi.fn();
        render(<KanbanBoard tasks={tasks} onMoveTask={onMoveTask} canDrag canDragTask={() => false} />);
        drag(first.id, "DONE");
        expect(onMoveTask).not.toHaveBeenCalled();
    });

    it("renders a drag overlay only for an eligible active task", () => {
        render(<KanbanBoard tasks={tasks} onMoveTask={vi.fn()} canDrag />);
        act(() => { handlers.start?.({ active: { id: first.id } }); });
        expect(screen.getByTestId("drag-overlay")).toHaveTextContent(first.title);
        act(() => { handlers.cancel?.(); });
        expect(screen.queryByTestId("drag-overlay")).not.toBeInTheDocument();
    });
});
