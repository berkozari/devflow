import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeTask, makeTaskResponse, projectId } from "./fixtures";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@/services/api", () => ({ apiClient: http }));

import { taskService } from "@/features/tasks/services/task.service";

const taskId = "task-1";
const response = makeTaskResponse(makeTask());

beforeEach(() => {
    vi.resetAllMocks();
    for (const method of Object.values(http)) method.mockResolvedValue({ data: response });
});

describe("Tasks: HTTP service", () => {
    it("lists tasks and forwards structured filters", async () => {
        const filters = { status: "DONE" as const, page: 2, limit: 25, search: "release" };
        expect(await taskService.findAll(projectId, filters)).toEqual(response);
        expect(http.get).toHaveBeenCalledWith(`/projects/${projectId}/tasks`, { params: filters });
    });

    it("lists tasks without explicit filters", async () => {
        await taskService.findAll(projectId);
        expect(http.get).toHaveBeenCalledWith(`/projects/${projectId}/tasks`, { params: undefined });
    });

    it("loads one task using project and task IDs", async () => {
        expect(await taskService.findById(projectId, taskId)).toEqual(response);
        expect(http.get).toHaveBeenCalledWith(`/projects/${projectId}/tasks/${taskId}`);
    });

    it("creates a task with the provided body", async () => {
        const data = { title: "Create tests", priority: "HIGH" as const };
        expect(await taskService.create(projectId, data)).toEqual(response);
        expect(http.post).toHaveBeenCalledWith(`/projects/${projectId}/tasks`, data);
    });

    it("updates task fields using PATCH", async () => {
        const data = { title: "Updated title", status: "IN_PROGRESS" as const };
        expect(await taskService.update(projectId, taskId, data)).toEqual(response);
        expect(http.patch).toHaveBeenCalledWith(`/projects/${projectId}/tasks/${taskId}`, data);
    });

    it("sends the explicit move payload to the move endpoint", async () => {
        const data = { status: "DONE" as const, beforeTaskId: null };
        expect(await taskService.move(projectId, taskId, data)).toEqual(response);
        expect(http.patch).toHaveBeenCalledWith(`/projects/${projectId}/tasks/${taskId}/move`, data);
    });

    it("deletes a task with its project-scoped route", async () => {
        expect(await taskService.remove(projectId, taskId)).toEqual(response);
        expect(http.delete).toHaveBeenCalledWith(`/projects/${projectId}/tasks/${taskId}`);
    });

    it("propagates HTTP failures rather than returning a successful response", async () => {
        http.patch.mockRejectedValueOnce(new Error("Server unavailable"));
        await expect(taskService.move(projectId, taskId, { status: "DONE", beforeTaskId: null })).rejects.toThrow("Server unavailable");
    });
});
