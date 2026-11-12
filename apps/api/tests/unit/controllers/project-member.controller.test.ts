import { beforeEach, describe, expect, it, vi, } from "vitest";

const { findMembers, addMember, updateMemberRole, removeMember, } = vi.hoisted(() => ({ findMembers: vi.fn(), addMember: vi.fn(), updateMemberRole: vi.fn(), removeMember: vi.fn(), }));

vi.mock("../../../src/services/project-member.service.js", () => ({ projectMemberService: { findMembers, addMember, updateMemberRole, removeMember, }, }));

import { getProjectMembers, addProjectMember, updateProjectMember, removeProjectMember, } from "../../../src/controllers/project-member.controller.js";

const projectId = "00000000-0000-4000-8000-000000000001"; const userId = "00000000-0000-4000-8000-000000000002";

const user = { id: userId, email: "test@example.com", role: "USER" as const, };

function createMocks({ authenticated = true, params = { projectId }, body = {}, }: { authenticated?: boolean; params?: Record<string, string>; body?: Record<string, unknown>; } = {}) {
    const req = { user: authenticated ? user : undefined, params, body, } as any;

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as any;

    const next = vi.fn();

    return { req, res, next };


}

describe("Project Member Controller", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        findMembers.mockResolvedValue([]);
        addMember.mockResolvedValue({
            projectId,
            userId,
            role: "MEMBER",
        });
        updateMemberRole.mockResolvedValue({
            projectId,
            userId,
            role: "ADMIN",
        });
        removeMember.mockResolvedValue(undefined);
    });

    describe("getProjectMembers", () => {
        it("should return project members", async () => {
            const members = [{ userId, role: "MEMBER" }];
            findMembers.mockResolvedValue(members);

            const { req, res, next } = createMocks();

            await getProjectMembers(req, res, next);

            expect(findMembers).toHaveBeenCalledWith(projectId, userId);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: members,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 401 when user is not authenticated", async () => {
            const { req, res, next } = createMocks({
                authenticated: false,
            });

            await getProjectMembers(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Authentication required",
            });
            expect(findMembers).not.toHaveBeenCalled();
        });

        it("should forward validation errors", async () => {
            const { req, res, next } = createMocks({
                params: { projectId: "invalid-id" },
            });

            await getProjectMembers(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it("should forward service errors", async () => {
            const error = new Error("Service error");
            findMembers.mockRejectedValue(error);

            const { req, res, next } = createMocks();

            await getProjectMembers(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe("addProjectMember", () => {
        const body = {
            email: "member@example.com",
            role: "MEMBER",
        };

        it("should add a project member", async () => {
            const member = { projectId, userId, role: "MEMBER" };
            addMember.mockResolvedValue(member);

            const { req, res, next } = createMocks({ body });

            await addProjectMember(req, res, next);

            expect(addMember).toHaveBeenCalledWith(
                projectId,
                userId,
                body,
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Project member added successfully",
                data: member,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 401 when user is not authenticated", async () => {
            const { req, res, next } = createMocks({
                authenticated: false,
                body,
            });

            await addProjectMember(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(addMember).not.toHaveBeenCalled();
        });

        it("should forward parameter validation errors", async () => {
            const { req, res, next } = createMocks({
                params: { projectId: "invalid-id" },
                body,
            });

            await addProjectMember(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it("should forward body validation errors", async () => {
            const { req, res, next } = createMocks({
                body: {},
            });

            await addProjectMember(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it("should forward service errors", async () => {
            const error = new Error("Service error");
            addMember.mockRejectedValue(error);

            const { req, res, next } = createMocks({ body });

            await addProjectMember(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe("updateProjectMember", () => {
        const params = { projectId, userId };
        const body = { role: "ADMIN" };

        it("should update project member role", async () => {
            const member = { projectId, userId, role: "ADMIN" };
            updateMemberRole.mockResolvedValue(member);

            const { req, res, next } = createMocks({
                params,
                body,
            });

            await updateProjectMember(req, res, next);

            expect(updateMemberRole).toHaveBeenCalledWith(
                projectId,
                userId,
                userId,
                body,
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Project member role updated successfully",
                data: member,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 401 when user is not authenticated", async () => {
            const { req, res, next } = createMocks({
                authenticated: false,
                params,
                body,
            });

            await updateProjectMember(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(updateMemberRole).not.toHaveBeenCalled();
        });

        it("should forward parameter validation errors", async () => {
            const { req, res, next } = createMocks({
                params: {
                    projectId: "invalid-id",
                    userId,
                },
                body,
            });

            await updateProjectMember(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it("should forward body validation errors", async () => {
            const { req, res, next } = createMocks({
                params,
                body: {},
            });

            await updateProjectMember(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it("should forward service errors", async () => {
            const error = new Error("Service error");
            updateMemberRole.mockRejectedValue(error);

            const { req, res, next } = createMocks({
                params,
                body,
            });

            await updateProjectMember(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe("removeProjectMember", () => {
        const params = { projectId, userId };

        it("should remove project member", async () => {
            const { req, res, next } = createMocks({ params });

            await removeProjectMember(req, res, next);

            expect(removeMember).toHaveBeenCalledWith(
                projectId,
                userId,
                userId,
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Project member removed successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 401 when user is not authenticated", async () => {
            const { req, res, next } = createMocks({
                authenticated: false,
                params,
            });

            await removeProjectMember(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(removeMember).not.toHaveBeenCalled();
        });

        it("should forward parameter validation errors", async () => {
            const { req, res, next } = createMocks({
                params: {
                    projectId: "invalid-id",
                    userId,
                },
            });

            await removeProjectMember(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it("should forward service errors", async () => {
            const error = new Error("Service error");
            removeMember.mockRejectedValue(error);

            const { req, res, next } = createMocks({ params });

            await removeProjectMember(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });


});