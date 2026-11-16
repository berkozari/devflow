import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
    create: vi.fn(), update: vi.fn(), delete: vi.fn(),
}));
const members = vi.hoisted(() => ({
    add: vi.fn(), update: vi.fn(), remove: vi.fn(),
}));
vi.mock("@/features/projects/services/project.service", () => ({ projectService: service }));
vi.mock("@/features/projects/services/project-member.service", () => ({ projectMemberService: members }));

import { useCreateProject } from "@/features/projects/hooks/useCreateProject";
import { useUpdateProject } from "@/features/projects/hooks/useUpdateProject";
import { useDeleteProject } from "@/features/projects/hooks/useDeleteProject";
import { useAddProjectMember } from "@/features/projects/hooks/useAddProjectMember";
import { useRemoveProjectMember } from "@/features/projects/hooks/useRemoveProjectMember";
import { useUpdateMemberRole } from "@/features/projects/hooks/useUpdateMemberRole";
import { useUpdateProjectMember } from "@/features/projects/hooks/useUpdateProjectMember";
import { projectKeys } from "@/features/projects/hooks/project.keys";
import { projectMemberKeys } from "@/features/projects/hooks/project-member.keys";

let client: QueryClient;
function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    client = new QueryClient({ defaultOptions: {
        queries: { retry: false, gcTime: 0 }, mutations: { retry: false },
    } });
    vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
    vi.spyOn(client, "removeQueries");
    for (const fn of [...Object.values(service), ...Object.values(members)]) fn.mockResolvedValue({ success: true });
});

async function run<T>(mutation: { mutateAsync: (variables: T) => Promise<unknown> }, variables: T) {
    await act(async () => { await mutation.mutateAsync(variables); });
}

describe("Projects: mutation hooks", () => {
    it("creates a project and invalidates the projects list", async () => {
        const { result } = renderHook(() => useCreateProject(), { wrapper });
        const data = { name: "Launch", description: "Notes" };
        await run(result.current, data);
        expect(service.create).toHaveBeenCalledWith(data);
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectKeys.lists() });
    });
    it("does not invalidate lists on a failed create", async () => {
        service.create.mockRejectedValueOnce(new Error("Server rejected"));
        const { result } = renderHook(() => useCreateProject(), { wrapper });
        await act(async () => {
            await expect(result.current.mutateAsync({ name: "Launch" })).rejects.toThrow("Server rejected");
        });
        expect(client.invalidateQueries).not.toHaveBeenCalled();
    });
    it("updates a project and invalidates both detail and list queries", async () => {
        const { result } = renderHook(() => useUpdateProject(), { wrapper });
        const args = { id: "p1", data: { status: "COMPLETED" as const } };
        await run(result.current, args);
        expect(service.update).toHaveBeenCalledWith("p1", args.data);
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectKeys.detail("p1") });
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectKeys.lists() });
    });
    it("deletes a project, removes its detail and invalidates lists", async () => {
        const { result } = renderHook(() => useDeleteProject(), { wrapper });
        await run(result.current, "p1");
        expect(service.delete).toHaveBeenCalledWith("p1");
        expect(client.removeQueries).toHaveBeenCalledWith({ queryKey: projectKeys.detail("p1"), exact: true });
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectKeys.lists() });
    });
    it("adds a member and refreshes memberships and projects", async () => {
        const { result } = renderHook(() => useAddProjectMember("p1"), { wrapper });
        const data = { email: "new@example.com", role: "MEMBER" as const };
        await run(result.current, data);
        expect(members.add).toHaveBeenCalledWith("p1", data);
        await waitFor(() => expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectMemberKeys.list("p1") }));
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["projects"] });
    });
    it("removes a member and refreshes memberships and projects", async () => {
        const { result } = renderHook(() => useRemoveProjectMember("p1"), { wrapper });
        await run(result.current, "user-2");
        expect(members.remove).toHaveBeenCalledWith("p1", "user-2");
        await waitFor(() => expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectMemberKeys.list("p1") }));
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["projects"] });
    });
    it("updates a member role and invalidates its membership list", async () => {
        const { result } = renderHook(() => useUpdateMemberRole("p1"), { wrapper });
        await run(result.current, { userId: "user-2", data: { role: "ADMIN" } });
        expect(members.update).toHaveBeenCalledWith("p1", "user-2", { role: "ADMIN" });
        await waitFor(() => expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectMemberKeys.list("p1") }));
    });
    it("invalidates member list and project detail after the alternate role hook", async () => {
        const { result } = renderHook(() => useUpdateProjectMember(), { wrapper });
        const args = { projectId: "p1", userId: "user-2", data: { role: "MEMBER" as const } };
        await run(result.current, args);
        expect(members.update).toHaveBeenCalledWith("p1", "user-2", args.data);
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectMemberKeys.list("p1") });
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: projectKeys.detail("p1") });
    });
});
