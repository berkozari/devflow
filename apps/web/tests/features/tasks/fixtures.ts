import type { Task, TaskListResponse, TaskResponse } from "@/features/tasks/types/task.types";

export const projectId = "project-1";
export const otherProjectId = "project-2";

export function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: "task-1",
        projectId,
        creatorId: "owner-1",
        assigneeId: "member-1",
        title: "Review API changes",
        description: "Check the integration tests",
        status: "TODO",
        priority: "HIGH",
        position: 0,
        dueDate: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        creator: { id: "owner-1", name: "Project Owner", email: "owner@example.com" },
        assignee: { id: "member-1", name: "Project Member", email: "member@example.com" },
        ...overrides,
    };
}

export function makeTaskList(tasks: Task[], overrides: Partial<TaskListResponse> = {}): TaskListResponse {
    return {
        success: true,
        data: tasks,
        pagination: { page: 1, limit: 10, total: tasks.length, totalPages: tasks.length ? 1 : 0 },
        ...overrides,
    };
}

export function makeTaskResponse(task: Task): TaskResponse {
    return { success: true, data: task };
}
