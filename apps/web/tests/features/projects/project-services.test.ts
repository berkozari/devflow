import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
    get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(),
}));
vi.mock("@/services/api", () => ({ apiClient: http }));

import { projectService } from "@/features/projects/services/project.service";
import { projectMemberService } from "@/features/projects/services/project-member.service";

const response = { success: true, data: { id: "result-1" } };

beforeEach(() => {
    vi.resetAllMocks();
    for (const method of Object.values(http)) method.mockResolvedValue({ data: response });
});

describe("Projects: HTTP service endpoints", () => {
    it("creates a project with the submitted payload", async () => {
        const payload = { name: "Launch", description: "Description" };
        expect(await projectService.create(payload)).toEqual(response);
        expect(http.post).toHaveBeenCalledWith("/projects", payload);
    });
    it("lists projects and forwards pagination and filters", async () => {
        const params = { page: 2, limit: 10, search: "launch", status: "ACTIVE" as const };
        expect(await projectService.findAll(params)).toEqual(response);
        expect(http.get).toHaveBeenCalledWith("/projects", { params });
    });
    it("lists projects without explicit params", async () => {
        await projectService.findAll();
        expect(http.get).toHaveBeenCalledWith("/projects", { params: undefined });
    });
    it("gets one project", async () => {
        await projectService.findById("project-1");
        expect(http.get).toHaveBeenCalledWith("/projects/project-1");
    });
    it("updates a project", async () => {
        const data = { status: "COMPLETED" as const };
        await projectService.update("project-1", data);
        expect(http.patch).toHaveBeenCalledWith("/projects/project-1", data);
    });
    it("deletes a project", async () => {
        await projectService.delete("project-1");
        expect(http.delete).toHaveBeenCalledWith("/projects/project-1");
    });
    it("fetches project members from the project service", async () => {
        await projectService.findMembers("project-1");
        expect(http.get).toHaveBeenCalledWith("/projects/project-1/members");
    });
    it("adds, updates and removes members via the project service", async () => {
        await projectService.addMember("project-1", { email: "user@example.com", role: "MEMBER" });
        await projectService.updateMemberRole("project-1", "user-1", { role: "ADMIN" });
        await projectService.removeMember("project-1", "user-1");
        expect(http.post).toHaveBeenCalledWith("/projects/project-1/members", { email: "user@example.com", role: "MEMBER" });
        expect(http.patch).toHaveBeenCalledWith("/projects/project-1/members/user-1", { role: "ADMIN" });
        expect(http.delete).toHaveBeenCalledWith("/projects/project-1/members/user-1");
    });
    it("propagates API errors without returning a successful response", async () => {
        http.post.mockRejectedValueOnce(new Error("network down"));
        await expect(projectService.create({ name: "Launch" })).rejects.toThrow("network down");
    });
});

describe("Project members: HTTP service endpoints", () => {
    it("lists members", async () => {
        expect(await projectMemberService.findAll("project-1")).toEqual(response);
        expect(http.get).toHaveBeenCalledWith("/projects/project-1/members");
    });
    it("adds a user and role", async () => {
        const payload = { email: "user@example.com", role: "ADMIN" as const };
        expect(await projectMemberService.add("project-1", payload)).toEqual(response);
        expect(http.post).toHaveBeenCalledWith("/projects/project-1/members", payload);
    });
    it("updates a role", async () => {
        await projectMemberService.update("project-1", "member-1", { role: "MEMBER" });
        expect(http.patch).toHaveBeenCalledWith("/projects/project-1/members/member-1", { role: "MEMBER" });
    });
    it("removes a member", async () => {
        await projectMemberService.remove("project-1", "member-1");
        expect(http.delete).toHaveBeenCalledWith("/projects/project-1/members/member-1");
    });
});
