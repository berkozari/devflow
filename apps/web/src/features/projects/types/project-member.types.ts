
export type ProjectMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface ProjectMemberUser {
    id: string;
    name: string;
    email: string;
}

export interface ProjectMember {
    id: string;
    projectId: string;
    userId: string;
    role: ProjectMemberRole;
    createdAt: string;
    updatedAt: string;
    user: ProjectMemberUser;
}

export interface AddProjectMemberPayload {
    email: string;
    role?: Exclude<ProjectMemberRole, "OWNER">;
}

export interface UpdateProjectMemberPayload {
    role: Exclude<ProjectMemberRole, "OWNER">;
}
