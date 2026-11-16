import { describe, expect, it } from "vitest";
import {
    canManageMember,
    getProjectPermissions,
} from "@/features/projects/utils/project-permissions";
import type { ProjectMemberRole } from "@/features/projects/types/project-member.types";
import { adminId, makeMember, makeProjectDetail, memberId, outsiderId, ownerId } from "./fixtures";

describe("Projects: UI permissions", () => {
    const project = makeProjectDetail();

    it("grants the project owner every project-level permission", () => {
        expect(getProjectPermissions(project, ownerId)).toEqual({
            role: "OWNER", canView: true, canUpdateProject: true,
            canDeleteProject: true, canAddMember: true, canAssignAdmin: true,
            canUpdateMemberRole: true, canRemoveMember: true,
        });
    });
    it("grants ADMIN management without deletion or admin assignment", () => {
        expect(getProjectPermissions(project, adminId)).toEqual({
            role: "ADMIN", canView: true, canUpdateProject: true,
            canDeleteProject: false, canAddMember: true, canAssignAdmin: false,
            canUpdateMemberRole: true, canRemoveMember: true,
        });
    });
    it("gives MEMBER read-only access", () => {
        expect(getProjectPermissions(project, memberId)).toEqual({
            role: "MEMBER", canView: true, canUpdateProject: false,
            canDeleteProject: false, canAddMember: false, canAssignAdmin: false,
            canUpdateMemberRole: false, canRemoveMember: false,
        });
    });
    it.each([outsiderId, undefined])("rejects access for nonmembers (%s)", (id) => {
        const result = getProjectPermissions(project, id);
        expect(result.role).toBeNull();
        expect(Object.entries(result).filter(([key]) => key !== "role").every(([, value]) => value === false)).toBe(true);
    });
    it("prioritizes ownerId over an inconsistent membership role", () => {
        const inconsistent = makeProjectDetail({ members: [makeMember("MEMBER", ownerId)] });
        expect(getProjectPermissions(inconsistent, ownerId).role).toBe("OWNER");
    });

    it.each([
        ["OWNER", "OWNER", false],
        ["OWNER", "ADMIN", true],
        ["OWNER", "MEMBER", true],
        ["ADMIN", "OWNER", false],
        ["ADMIN", "ADMIN", false],
        ["ADMIN", "MEMBER", true],
        ["MEMBER", "ADMIN", false],
        ["MEMBER", "MEMBER", false],
        [null, "MEMBER", false],
    ] as const)("canManageMember(%s, %s) = %s", (actor, target, permitted) => {
        expect(canManageMember(actor as ProjectMemberRole | null, target as ProjectMemberRole)).toBe(permitted);
    });
});
