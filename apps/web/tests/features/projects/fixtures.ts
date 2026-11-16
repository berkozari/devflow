import type { ProjectDetail, ProjectListItem } from "@/features/projects/types/project.types";
import type { ProjectMember } from "@/features/projects/types/project-member.types";

export const ownerId = "owner-1";
export const adminId = "admin-1";
export const memberId = "member-1";
export const outsiderId = "outsider-1";

export function makeMember(
    role: ProjectMember["role"] = "MEMBER",
    userId = memberId,
): ProjectMember {
    return {
        id: `membership-${userId}`,
        projectId: "project-1",
        userId,
        role,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        user: { id: userId, name: userId, email: `${userId}@example.com` },
    };
}

export function makeProject(overrides: Partial<ProjectListItem> = {}): ProjectListItem {
    return {
        id: "project-1",
        name: "DevFlow Launch",
        description: "Product launch board",
        status: "ACTIVE",
        ownerId,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        _count: { members: 3, tasks: 7 },
        ...overrides,
    };
}

export function makeProjectDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
    return {
        ...makeProject(),
        owner: { id: ownerId, name: "Project Owner", email: "owner@example.com" },
        members: [
            makeMember("OWNER", ownerId),
            makeMember("ADMIN", adminId),
            makeMember("MEMBER", memberId),
        ],
        ...overrides,
    };
}
