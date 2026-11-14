
import type { ProjectDetail } from "../types/project.types";
import type { ProjectMemberRole } from "../types/project-member.types";

export interface ProjectPermissions {
    role: ProjectMemberRole | null;
    canView: boolean;
    canUpdateProject: boolean;
    canDeleteProject: boolean;
    canAddMember: boolean;
    canAssignAdmin: boolean;
    canUpdateMemberRole: boolean;
    canRemoveMember: boolean;
}

export function getProjectPermissions(
    project: ProjectDetail,
    userId: string | undefined,
): ProjectPermissions {
    const membership = project.members.find(
        (member) => member.userId === userId,
    );

    const role: ProjectMemberRole | null =
        project.ownerId === userId
            ? "OWNER"
            : membership?.role ?? null;

    return {
        role,
        canView: role !== null,

        canUpdateProject:
            role === "OWNER" || role === "ADMIN",

        canDeleteProject:
            role === "OWNER",

        canAddMember:
            role === "OWNER" || role === "ADMIN",

        canAssignAdmin:
            role === "OWNER",

        canUpdateMemberRole:
            role === "OWNER" || role === "ADMIN",

        canRemoveMember:
            role === "OWNER" || role === "ADMIN",
    };
}

export function canManageMember(
    actorRole: ProjectMemberRole | null,
    targetRole: ProjectMemberRole,
): boolean {
    if (targetRole === "OWNER") {
        return false;
    }

    if (actorRole === "OWNER") {
        return true;
    }

    if (actorRole === "ADMIN") {
        return targetRole === "MEMBER";
    }

    return false;
}
