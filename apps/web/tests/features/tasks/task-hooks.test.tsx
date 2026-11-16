import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
    findAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
}));
vi.mock("@/features/tasks/services/task.service", () => ({ taskService: service }));

import { useTasks } from "@/features/tasks/hooks/useTasks";
import { useCreateTask } from "@/features/tasks/hooks/useCreateTask";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask";
import { useDeleteTask } from "@/features/tasks/hooks/useDeleteTask";
import { taskKeys } from "@/features/tasks/hooks/task.keys";
import { makeTask, makeTaskList, makeTaskResponse, projectId } from "./fixtures";

let client: QueryClient;
function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    service.findAll.mockResolvedValue(makeTaskList([makeTask()]));
    service.create.mockResolvedValue(makeTaskResponse(makeTask()));
    service.update.mockResolvedValue(makeTaskResponse(makeTask()));
    service.remove.mockResolvedValue({ success: true });
    vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
});

describe("Tasks: React Query keys, queries and mutations", () => {
    it("uses project-scoped list/detail keys and distinct filters", () => {
        expect(taskKeys.lists()).toEqual(["tasks", "list"]);
        expect(taskKeys.list("p1", { status: "TODO" })).not.toEqual(taskKeys.list("p1", { status: "DONE" }));
        expect(taskKeys.list("p1")).not.toEqual(taskKeys.list("p2"));
        expect(taskKeys.detail("p1", "t1")).toEqual(["tasks", "detail", "p1", "t1"]);
    });

    it("fetches tasks and uses filters as part of the query key", async () => {
        const filters = { status: "TODO" as const, search: "API", page: 2 };
        const { result } = renderHook(() => useTasks(projectId, filters), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(service.findAll).toHaveBeenCalledWith(projectId, filters);
        expect(client.getQueryData(taskKeys.list(projectId, filters))).toEqual(makeTaskList([makeTask()]));
    });

    it("does not query when project ID is empty", () => {
        const { result } = renderHook(() => useTasks(""), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(service.findAll).not.toHaveBeenCalled();
    });

    it("exposes a failed task query", async () => {
        service.findAll.mockRejectedValueOnce(new Error("Tasks unavailable"));
        const { result } = renderHook(() => useTasks(projectId), { wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe("Tasks unavailable");
    });

    it("creates a task and invalidates lists", async () => {
        const { result } = renderHook(() => useCreateTask(projectId), { wrapper });
        const payload = { title: "Add tests", status: "TODO" as const };
        await act(async () => { await result.current.mutateAsync(payload); });
        expect(service.create).toHaveBeenCalledWith(projectId, payload);
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: taskKeys.lists() });
    });

    it("does not invalidate lists when creation fails", async () => {
        service.create.mockRejectedValueOnce(new Error("Create rejected"));
        const { result } = renderHook(() => useCreateTask(projectId), { wrapper });
        await act(async () => {
            await expect(result.current.mutateAsync({ title: "New task" })).rejects.toThrow("Create rejected");
        });
        expect(client.invalidateQueries).not.toHaveBeenCalled();
    });

    it("updates a task and invalidates both task list and detail", async () => {
        const { result } = renderHook(() => useUpdateTask(projectId), { wrapper });
        const variables = { taskId: "task-1", data: { status: "IN_REVIEW" as const } };
        await act(async () => { await result.current.mutateAsync(variables); });
        expect(service.update).toHaveBeenCalledWith(projectId, variables.taskId, variables.data);
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: taskKeys.lists() });
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: taskKeys.detail(projectId, variables.taskId) });
    });

    it("deletes a task and invalidates both task list and detail", async () => {
        const { result } = renderHook(() => useDeleteTask(projectId), { wrapper });
        await act(async () => { await result.current.mutateAsync({ taskId: "task-1" }); });
        expect(service.remove).toHaveBeenCalledWith(projectId, "task-1");
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: taskKeys.lists() });
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: taskKeys.detail(projectId, "task-1") });
    });

    it("does not invalidate caches after a failed update", async () => {
        service.update.mockRejectedValueOnce(new Error("Update rejected"));
        const { result } = renderHook(() => useUpdateTask(projectId), { wrapper });
        await act(async () => {
            await expect(result.current.mutateAsync({ taskId: "task-1", data: { title: "New title" } })).rejects.toThrow("Update rejected");
        });
        expect(client.invalidateQueries).not.toHaveBeenCalled();
    });
});
