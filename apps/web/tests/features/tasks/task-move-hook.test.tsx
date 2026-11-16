import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({ move: vi.fn() }));
vi.mock("@/features/tasks/services/task.service", () => ({ taskService: service }));

import { useMoveTask } from "@/features/tasks/hooks/useMoveTask";
import { taskKeys } from "@/features/tasks/hooks/task.keys";
import type { MoveTaskPayload } from "@/features/tasks/types/task.types";
import { makeTask, makeTaskList, makeTaskResponse, otherProjectId, projectId } from "./fixtures";

let client: QueryClient;
const detailKey = taskKeys.detail(projectId, "task-1");
const listKey = taskKeys.list(projectId);
const todoKey = taskKeys.list(projectId, { status: "TODO" });
const otherKey = taskKeys.list(otherProjectId);

function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}
function initializeCaches() {
    const first = makeTask();
    const second = makeTask({ id: "task-2", title: "Write documentation", position: 1 });
    const otherProjectTask = makeTask({ id: "other-1", projectId: otherProjectId });
    client.setQueryData(listKey, makeTaskList([first, second]));
    client.setQueryData(todoKey, makeTaskList([first, second]));
    client.setQueryData(detailKey, makeTaskResponse(first));
    client.setQueryData(otherKey, makeTaskList([otherProjectTask]));
    return { first, second };
}
const move = (payload: MoveTaskPayload = { status: "DONE", beforeTaskId: null }) => ({ taskId: "task-1", data: payload });

beforeEach(() => {
    vi.resetAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
});

describe("Tasks: optimistic move, filtered lists, rollback, isolation", () => {
    it("optimistically updates status, filtered pagination and detail while request is pending", async () => {
        const { first } = initializeCaches();
        const remote = deferred<ReturnType<typeof makeTaskResponse>>();
        service.move.mockReturnValue(remote.promise);
        const { result } = renderHook(() => useMoveTask(projectId), { wrapper });

        act(() => { result.current.mutate(move()); });
        await waitFor(() => expect(client.getQueryData<ReturnType<typeof makeTaskResponse>>(detailKey)?.data.status).toBe("DONE"));
        expect(client.getQueryData<ReturnType<typeof makeTaskList>>(listKey)?.data[1]?.status).toBe("DONE");
        const filtered = client.getQueryData<ReturnType<typeof makeTaskList>>(todoKey)!;
        expect(filtered.data.map((task) => task.id)).toEqual(["task-2"]);
        expect(filtered.pagination).toMatchObject({ total: 1, totalPages: 1 });
        expect(client.getQueryData<ReturnType<typeof makeTaskList>>(otherKey)?.data[0]?.status).toBe("TODO");
        expect(service.move).toHaveBeenCalledWith(projectId, first.id, { status: "DONE", beforeTaskId: null });

        await act(async () => { remote.resolve(makeTaskResponse(makeTask({ status: "DONE" }))); await remote.promise; });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("inserts a task before the requested sibling and keeps the detail synchronized", async () => {
        initializeCaches();
        // Start with the moving task after its sibling to verify reordering.
        const old = client.getQueryData<ReturnType<typeof makeTaskList>>(listKey)!;
        client.setQueryData(listKey, { ...old, data: [old.data[1]!, old.data[0]!] });
        service.move.mockResolvedValue(makeTaskResponse(makeTask({ status: "TODO" })));
        const { result } = renderHook(() => useMoveTask(projectId), { wrapper });
        await act(async () => { await result.current.mutateAsync(move({ status: "TODO", beforeTaskId: "task-2" })); });
        expect(client.getQueryData<ReturnType<typeof makeTaskList>>(listKey)?.data.map((task) => task.id)).toEqual(["task-1", "task-2"]);
        expect(client.getQueryData<ReturnType<typeof makeTaskResponse>>(detailKey)?.data.status).toBe("TODO");
    });

    it("restores prior lists and task detail when the API rejects the move", async () => {
        initializeCaches();
        const previousList = client.getQueryData(listKey);
        const previousTodo = client.getQueryData(todoKey);
        const previousDetail = client.getQueryData(detailKey);
        const otherSnapshot = client.getQueryData(otherKey);
        service.move.mockRejectedValueOnce(new Error("Move rejected"));
        const { result } = renderHook(() => useMoveTask(projectId), { wrapper });

        await act(async () => { await expect(result.current.mutateAsync(move())).rejects.toThrow("Move rejected"); });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(client.getQueryData(listKey)).toEqual(previousList);
        expect(client.getQueryData(todoKey)).toEqual(previousTodo);
        expect(client.getQueryData(detailKey)).toEqual(previousDetail);
        expect(client.getQueryData(otherKey)).toEqual(otherSnapshot);
    });

    it("invalidates lists and detail after a successful move", async () => {
        initializeCaches();
        const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
        service.move.mockResolvedValue(makeTaskResponse(makeTask({ status: "DONE" })));
        const { result } = renderHook(() => useMoveTask(projectId), { wrapper });
        await act(async () => { await result.current.mutateAsync(move()); });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tasks", "list", projectId] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: detailKey });
    });

    it("also invalidates lists and detail after a failed move", async () => {
        initializeCaches();
        const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
        service.move.mockRejectedValueOnce(new Error("Move rejected"));
        const { result } = renderHook(() => useMoveTask(projectId), { wrapper });
        await act(async () => { await expect(result.current.mutateAsync(move())).rejects.toThrow("Move rejected"); });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tasks", "list", projectId] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: detailKey });
    });

    it("works when there is no cached task data", async () => {
        service.move.mockResolvedValue(
            makeTaskResponse(makeTask({ status: "DONE" })),
        );

        const { result } = renderHook(
            () => useMoveTask(projectId),
            { wrapper },
        );

        await act(async () => {
            await result.current.mutateAsync(move());
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(service.move).toHaveBeenCalledOnce();
        expect(client.getQueryData(detailKey)).toBeUndefined();
    });
});
