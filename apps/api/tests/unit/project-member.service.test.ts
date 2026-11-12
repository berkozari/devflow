
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { Prisma } from "../../src/generated/prisma/client.js";

const {
    findProject,
    findProjectMember,
    findProjectMembers,
    findUserByEmail,
    create,
    updateRole,
    deleteMember,
} = vi.hoisted(() => ({
    findProject: vi.fn(),
    findProjectMember: vi.fn(),
    findProjectMembers: vi.fn(),
    findUserByEmail: vi.fn(),
    create: vi.fn(),
    updateRole: vi.fn(),
    deleteMember: vi.fn(),
}));

vi.mock("../../src/repositories/project-member.repository.js", () => ({
    projectMemberRepository: {
        findProject,
        findProjectMember,
        findProjectMembers,
        findUserByEmail,
        create,
        updateRole,
        delete: deleteMember,
    },
}));

import { projectMemberService } from "../../src/services/project-member.service.js";

const projectId = "00000000-0000-4000-8000-000000000001";

const ownerId = "00000000-0000-4000-8000-000000000002";

const adminId = "00000000-0000-4000-8000-000000000003";

const memberId = "00000000-0000-4000-8000-000000000004";

const targetId = "00000000-0000-4000-8000-000000000005";

const project = {
    id: projectId,
    ownerId,
};

const adminMembership = {
    projectId,
    userId: adminId,
    role: "ADMIN" as const,
};

const memberMembership = {
    projectId,
    userId: memberId,
    role: "MEMBER" as const,
};

const targetMembership = {
    projectId,
    userId: targetId,
    role: "MEMBER" as const,
};

const targetUser = {
    id: targetId,
    name: "Target User",
    email: "target@test.com",
};

async function expectHttpError(
    promise: Promise<unknown>,
    statusCode: number,
) {
    try {
        await promise;
        throw new Error("Expected service to throw");
    } catch (error) {
        expect(error).toMatchObject({
            statusCode,
        });
    }
}

describe("Project Member Service", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        findProject.mockResolvedValue(project);
        findProjectMember.mockResolvedValue(null);
        findProjectMembers.mockResolvedValue([]);
        findUserByEmail.mockResolvedValue(targetUser);

        create.mockResolvedValue({
            ...targetMembership,
            user: targetUser,
        });

        updateRole.mockResolvedValue({
            ...targetMembership,
            role: "ADMIN",
        });

        deleteMember.mockResolvedValue(targetMembership);
    });

    describe("findMembers", () => {
        it("should allow OWNER to list members", async () => {
            const result = await projectMemberService.findMembers(
                projectId,
                ownerId,
            );

            expect(result).toEqual([]);
            expect(findProjectMembers).toHaveBeenCalledWith(projectId);
        });

        it("should allow MEMBER to list members", async () => {
            findProjectMember.mockResolvedValue(memberMembership);

            await projectMemberService.findMembers(
                projectId,
                memberId,
            );

            expect(findProjectMembers).toHaveBeenCalledWith(projectId);
        });

        it("should return 404 when project does not exist", async () => {
            findProject.mockResolvedValue(null);

            await expectHttpError(
                projectMemberService.findMembers(projectId, ownerId),
                404,
            );
        });

        it("should return 404 for users outside the project", async () => {
            await expectHttpError(
                projectMemberService.findMembers(projectId, targetId),
                404,
            );
        });
    });

    describe("addMember", () => {
        it("should allow OWNER to add a MEMBER", async () => {
            const result = await projectMemberService.addMember(
                projectId,
                ownerId,
                {
                    email: targetUser.email,
                    role: "MEMBER",
                },
            );

            expect(result).toEqual({
                ...targetMembership,
                user: targetUser,
            });

            expect(create).toHaveBeenCalledWith(
                projectId,
                targetId,
                "MEMBER",
            );
        });

        it("should allow ADMIN to add a MEMBER", async () => {
            // Project must exist.
            findProject.mockResolvedValue(project);

            // First call: identify the actor as ADMIN.
            // Second call: target user is not already a member.
            findProjectMember
                .mockResolvedValueOnce(adminMembership)
                .mockResolvedValueOnce(null);

            findUserByEmail.mockResolvedValue(targetUser);

            create.mockResolvedValue({
                ...targetMembership,
                user: targetUser,
            });

            await projectMemberService.addMember(
                projectId,
                adminId,
                {
                    email: targetUser.email,
                    role: "MEMBER",
                },
            );

            expect(findProject).toHaveBeenCalledWith(projectId);

            expect(create).toHaveBeenCalledWith(
                projectId,
                targetId,
                "MEMBER",
            );
        });

        it("should prevent MEMBER from adding another member", async () => {
            findProjectMember.mockResolvedValue(memberMembership);

            await expectHttpError(
                projectMemberService.addMember(
                    projectId,
                    memberId,
                    {
                        email: targetUser.email,
                        role: "MEMBER",
                    },
                ),
                403,
            );

            expect(create).not.toHaveBeenCalled();
        });

        it("should prevent ADMIN from adding another ADMIN", async () => {
            findProjectMember.mockResolvedValue(adminMembership);

            await expectHttpError(
                projectMemberService.addMember(
                    projectId,
                    adminId,
                    {
                        email: targetUser.email,
                        role: "ADMIN",
                    },
                ),
                403,
            );

            expect(create).not.toHaveBeenCalled();
        });

        it("should return 404 when user does not exist", async () => {
            findUserByEmail.mockResolvedValue(null);

            await expectHttpError(
                projectMemberService.addMember(
                    projectId,
                    ownerId,
                    {
                        email: "unknown@test.com",
                        role: "MEMBER",
                    },
                ),
                404,
            );
        });

        it("should return 409 when user is already a member", async () => {
            findProjectMember.mockResolvedValue(memberMembership);

            await expectHttpError(
                projectMemberService.addMember(
                    projectId,
                    ownerId,
                    {
                        email: "member@test.com",
                        role: "MEMBER",
                    },
                ),
                409,
            );

            expect(create).not.toHaveBeenCalled();
        });

        it("should prevent adding the project owner as a member", async () => {
            findUserByEmail.mockResolvedValue({
                ...targetUser,
                id: ownerId,
            });

            await expectHttpError(
                projectMemberService.addMember(
                    projectId,
                    ownerId,
                    {
                        email: targetUser.email,
                        role: "MEMBER",
                    },
                ),
                409,
            );
        });

        it("should return 409 when database unique constraint fails", async () => {
            create.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError(
                    "Unique constraint failed",
                    {
                        code: "P2002",
                        clientVersion: "7.10.0",
                    },
                ),
            );

            await expectHttpError(
                projectMemberService.addMember(
                    projectId,
                    ownerId,
                    {
                        email: targetUser.email,
                        role: "MEMBER",
                    },
                ),
                409,
            );
        });
    });

    describe("updateMemberRole", () => {
        it("should allow OWNER to update member role", async () => {
            findProjectMember.mockResolvedValue(memberMembership);

            await projectMemberService.updateMemberRole(
                projectId,
                ownerId,
                memberId,
                {
                    role: "ADMIN",
                },
            );

            expect(updateRole).toHaveBeenCalledWith(
                projectId,
                memberId,
                "ADMIN",
            );
        });

        it("should prevent ADMIN from updating member roles", async () => {
            findProjectMember.mockResolvedValue(adminMembership);

            await expectHttpError(
                projectMemberService.updateMemberRole(
                    projectId,
                    adminId,
                    memberId,
                    {
                        role: "ADMIN",
                    },
                ),
                403,
            );

            expect(updateRole).not.toHaveBeenCalled();
        });

        it("should return 404 when target membership does not exist", async () => {
            findProjectMember.mockResolvedValue(null);

            await expectHttpError(
                projectMemberService.updateMemberRole(
                    projectId,
                    ownerId,
                    targetId,
                    {
                        role: "ADMIN",
                    },
                ),
                404,
            );
        });
    });

    describe("removeMember", () => {
        it("should allow OWNER to remove a MEMBER", async () => {
            findProjectMember.mockResolvedValue(memberMembership);

            await projectMemberService.removeMember(
                projectId,
                ownerId,
                memberId,
            );

            expect(deleteMember).toHaveBeenCalledWith(
                projectId,
                memberId,
            );
        });

        it("should prevent MEMBER from removing another member", async () => {
            findProjectMember.mockResolvedValue(memberMembership);

            await expectHttpError(
                projectMemberService.removeMember(
                    projectId,
                    memberId,
                    targetId,
                ),
                403,
            );

            expect(deleteMember).not.toHaveBeenCalled();
        });

        it("should prevent ADMIN from removing another ADMIN", async () => {
            findProjectMember
                .mockResolvedValueOnce(adminMembership)
                .mockResolvedValueOnce({
                    ...adminMembership,
                    userId: targetId,
                    role: "ADMIN",
                });

            await expectHttpError(
                projectMemberService.removeMember(
                    projectId,
                    adminId,
                    targetId,
                ),
                403,
            );

            expect(deleteMember).not.toHaveBeenCalled();
        });

        it("should return 404 when target membership does not exist", async () => {
            findProjectMember.mockResolvedValue(null);

            await expectHttpError(
                projectMemberService.removeMember(
                    projectId,
                    ownerId,
                    targetId,
                ),
                404,
            );
        });
    });
});
