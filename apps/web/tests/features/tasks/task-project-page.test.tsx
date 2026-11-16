import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task, TaskFilters, TaskStatus } from "@/features/tasks/types/task.types";
import { makeProjectDetail } from "../projects/fixtures";
import { makeTask, makeTaskList } from "./fixtures";

const mocks = vi.hoisted(() => ({
    useProject: vi.fn(), useAuth: vi.fn(), useTasks: vi.fn(),
    create: vi.fn(), update: vi.fn(), move: vi.fn(), remove: vi.fn(),
    refetchProject: vi.fn(), refetchTasks: vi.fn(),
}));
vi.mock("@/features/projects/hooks/useProject", () => ({ useProject: mocks.useProject }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/features/tasks/hooks/useTasks", () => ({ useTasks: mocks.useTasks }));
vi.mock("@/features/tasks/hooks/useCreateTask", () => ({ useCreateTask: () => ({ mutate: mocks.create, isPending: false }) }));
vi.mock("@/features/tasks/hooks/useUpdateTask", () => ({ useUpdateTask: () => ({ mutate: mocks.update, isPending: false }) }));
vi.mock("@/features/tasks/hooks/useMoveTask", () => ({ useMoveTask: () => ({ mutate: mocks.move, isPending: false }) }));
vi.mock("@/features/tasks/hooks/useDeleteTask", () => ({ useDeleteTask: () => ({ mutate: mocks.remove, isPending: false }) }));
vi.mock("@/features/projects/components/ProjectHeader", () => ({ ProjectHeader: () => <div>Project header</div> }));
vi.mock("@/features/projects/components/ProjectStats", () => ({ ProjectStats: () => <div>Project statistics</div> }));
vi.mock("@/features/projects/components/ProjectMembers", () => ({ ProjectMembers: () => <div>Project members</div> }));
vi.mock("@/features/tasks/components/TaskFilters", () => ({
    TaskFilters: ({ onChange }: { onChange: (next: TaskFilters) => void }) =>
        <button onClick={() => onChange({ status: "DONE", page: 1, limit: 100 })}>Filter done</button>,
}));
vi.mock("@/features/tasks/components/KanbanBoard", () => ({
    KanbanBoard: ({ tasks, onMoveTask, onTaskClick, onAddTask, canDragTask }: {
        tasks: Task[];
        onMoveTask: (taskId: string, status: TaskStatus, beforeTaskId: string | null) => void;
        onTaskClick: (task: Task) => void;
        onAddTask: (status: TaskStatus) => void;
        canDragTask: (task: Task) => boolean;
    }) => <div data-testid="task-board">
        {tasks.map((task) => <div key={task.id}>
            <button onClick={() => onTaskClick(task)}>Select {task.title}</button>
            <button disabled={!canDragTask(task)} onClick={() => onMoveTask(task.id, "DONE", null)}>Move {task.title}</button>
        </div>)}
        <button onClick={() => onAddTask("IN_PROGRESS")}>Add in progress</button>
    </div>,
}));
vi.mock("@/features/tasks/components/TaskFormModal", () => ({
    TaskFormModal: ({ open, task, defaultStatus, canEditAllFields, onSubmit }: {
        open: boolean; task: Task | null; defaultStatus: TaskStatus; canEditAllFields: boolean;
        onSubmit: (data: { title?: string; status: TaskStatus }) => void;
    }) => open ? <div>
        <p>{task ? `Editing ${task.title}` : "Creating task"}</p>
        <p>{canEditAllFields ? "Full editing allowed" : "Status only"}</p>
        <button onClick={() => onSubmit({ title: "Task title", status: defaultStatus })}>Submit task form</button>
    </div> : null,
}));
vi.mock("@/features/tasks/components/TaskDetailDrawer", () => ({
    TaskDetailDrawer: ({ task, onEdit, onDelete, canEdit, canDelete }: {
        task: Task | null; onEdit: (task: Task) => void; onDelete: (task: Task) => void;
        canEdit: boolean; canDelete: boolean;
    }) => task ? <div>
        <p>Selected task: {task.title}</p>
        {canEdit && <button onClick={() => onEdit(task)}>Edit selected</button>}
        {canDelete && <button onClick={() => onDelete(task)}>Delete selected</button>}
    </div> : null,
}));

import { ProjectDetailPage } from "@/pages/projects/ProjectDetailPage";

function view() {
    return render(<MemoryRouter initialEntries={["/projects/project-1"]}>
        <Routes><Route path="/projects/:projectId" element={<ProjectDetailPage />} /></Routes>
    </MemoryRouter>);
}

beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    mocks.useAuth.mockReturnValue({ user: { id: "owner-1", name: "Owner", email: "owner@example.com" }, isLoading: false });
    mocks.useProject.mockReturnValue({
        data: { data: makeProjectDetail() }, isPending: false, isError: false, error: null,
        refetch: mocks.refetchProject,
    });
    mocks.useTasks.mockReturnValue({
        data: makeTaskList([makeTask()]), isPending: false, isError: false,
        refetch: mocks.refetchTasks,
    });
});

describe("Tasks: ProjectDetailPage integration with task UI", () => {
    it("shows the loading skeleton while project data loads", () => {
        mocks.useProject.mockReturnValue({ isPending: true });
        view();
        expect(screen.queryByText("Project Tasks")).not.toBeInTheDocument();
    });

    it("displays project loading errors with a retry action", async () => {
        mocks.useProject.mockReturnValue({ isPending: false, isError: true, error: new Error("Project unavailable"), refetch: mocks.refetchProject });
        view();
        expect(screen.getByText("Unable to load project")).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
        expect(mocks.refetchProject).toHaveBeenCalledOnce();
    });

    it("rejects access to a page when no current user can be identified", () => {
        mocks.useAuth.mockReturnValue({ user: null, isLoading: false });
        view();
        expect(screen.getByText("Unable to identify current user.")).toBeInTheDocument();
    });

    it("shows task query errors with retry", async () => {
        mocks.useTasks.mockReturnValue({ isPending: false, isError: true, refetch: mocks.refetchTasks });
        view();
        await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
        expect(mocks.refetchTasks).toHaveBeenCalledOnce();
    });

    it("creates a first task with the selected default status", async () => {
        mocks.useTasks.mockReturnValue({ data: makeTaskList([]), isPending: false, isError: false });
        view();
        await userEvent.setup().click(screen.getByRole("button", { name: "Create task" }));
        expect(screen.getByText("Creating task")).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Submit task form" }));
        expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ status: "TODO", title: "Task title" }), expect.objectContaining({ onSuccess: expect.any(Function) }));
    });

    it("shows filtered empty state and allows clearing filters", async () => {
        mocks.useTasks.mockReturnValue({ data: makeTaskList([]), isPending: false, isError: false });
        view();
        await userEvent.setup().click(screen.getByRole("button", { name: "Filter done" }));
        expect(screen.getByText("No matching tasks")).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
        expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    });

    it("lets the project owner move tasks", async () => {
        view();
        await userEvent.setup().click(screen.getByRole("button", { name: "Move Review API changes" }));
        expect(mocks.move).toHaveBeenCalledWith({ taskId: "task-1", data: { status: "DONE", beforeTaskId: null } });
    });

    it("prevents a different project MEMBER from moving an assigned task", () => {
        mocks.useAuth.mockReturnValue({ user: { id: "other-member", name: "Other", email: "other@example.com" }, isLoading: false });
        view();
        expect(screen.getByRole("button", { name: "Move Review API changes" })).toBeDisabled();
        expect(mocks.move).not.toHaveBeenCalled();
    });

    it("limits a task assignee to status-only edits", async () => {
        mocks.useAuth.mockReturnValue({ user: { id: "member-1", name: "Member", email: "member@example.com" }, isLoading: false });
        view();
        await userEvent.setup().click(screen.getByRole("button", { name: "Select Review API changes" }));
        await userEvent.setup().click(screen.getByRole("button", { name: "Edit selected" }));
        expect(screen.getByText("Status only")).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Submit task form" }));
        expect(mocks.update).toHaveBeenCalledWith({ taskId: "task-1", data: { status: "TODO" } }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    });

    it("requires owner confirmation before deleting a task", async () => {
        const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
        view();
        await userEvent.setup().click(screen.getByRole("button", { name: "Select Review API changes" }));
        await userEvent.setup().click(screen.getByRole("button", { name: "Delete selected" }));
        expect(mocks.remove).not.toHaveBeenCalled();
        await userEvent.setup().click(screen.getByRole("button", { name: "Delete selected" }));
        expect(mocks.remove).toHaveBeenCalledWith({ taskId: "task-1" }, expect.objectContaining({ onSuccess: expect.any(Function) }));
        expect(confirm).toHaveBeenCalledTimes(2);
    });
});
