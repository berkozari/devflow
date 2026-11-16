import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
    findAll: vi.fn(), findById: vi.fn(),
}));
const memberService = vi.hoisted(() => ({ findAll: vi.fn() }));
vi.mock("@/features/projects/services/project.service", () => ({ projectService: service }));
vi.mock("@/features/projects/services/project-member.service", () => ({ projectMemberService: memberService }));

import { useProjects } from "@/features/projects/hooks/useProjects";
import { useProject } from "@/features/projects/hooks/useProject";
import { useProjectMembers } from "@/features/projects/hooks/useProjectMembers";
import { projectKeys } from "@/features/projects/hooks/project.keys";
import { projectMemberKeys } from "@/features/projects/hooks/project-member.keys";

let client: QueryClient;
function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    vi.resetAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    service.findAll.mockResolvedValue({ success: true, data: [] });
    service.findById.mockResolvedValue({ success: true, data: { id: "project-1" } });
    memberService.findAll.mockResolvedValue({ success: true, data: [] });
});

describe("Projects: query keys and query hooks", () => {
    it("generates separate list keys for different filters", () => {
        expect(projectKeys.list({ status: "ACTIVE" })).not.toEqual(projectKeys.list({ status: "ARCHIVED" }));
        expect(projectKeys.detail("p1")).not.toEqual(projectKeys.detail("p2"));
        expect(projectKeys.members("p1")).toEqual(["projects", "detail", "p1", "members"]);
        expect(projectMemberKeys.list("p1")).toEqual(["project-members", "list", "p1"]);
    });
    it("lists projects and forwards filters", async () => {
        const params = { page: 2, search: "release", status: "ACTIVE" as const };
        const { result } = renderHook(() => useProjects(params), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(service.findAll).toHaveBeenCalledWith(params);
        expect(client.getQueryData(projectKeys.list(params))).toEqual({ success: true, data: [] });
    });
    it("loads project details by ID", async () => {
        const { result } = renderHook(() => useProject("project-1"), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(service.findById).toHaveBeenCalledWith("project-1");
    });
    it("does not query project details when ID is empty", () => {
        const { result } = renderHook(() => useProject(""), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(service.findById).not.toHaveBeenCalled();
    });
    it("loads member data with the correct scoped key", async () => {
        const { result } = renderHook(() => useProjectMembers("project-1"), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(memberService.findAll).toHaveBeenCalledWith("project-1");
        expect(client.getQueryData(projectMemberKeys.list("project-1"))).toEqual({ success: true, data: [] });
    });
    it("does not query members when project ID is empty", () => {
        const { result } = renderHook(() => useProjectMembers(""), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(memberService.findAll).not.toHaveBeenCalled();
    });
    it("exposes query failure without silently treating it as an empty list", async () => {
        service.findAll.mockRejectedValue(new Error("API unavailable"));
        const { result } = renderHook(() => useProjects(), { wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe("API unavailable");
    });
});
