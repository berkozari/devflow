
import type {
    CreateProjectFormValues,
} from "../schemas/project.schema";

export type ProjectStatus =
    | "PLANNING"
    | "ACTIVE"
    | "COMPLETED"
    | "ARCHIVED";

export interface ProjectOwner {
    id: string;
    name: string;
    email?: string;
}

export interface ProjectMemberUser {
    id: string;
    name: string;
    email: string;
}

export interface ProjectMember {
    user: ProjectMemberUser;
    // Diğer alanları ProjectMember Prisma modelini
    // gördükten sonra ekleyeceğiz.
}

export interface ProjectCounts {
    members?: number;
    tasks: number;
}

export interface ProjectListItem {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    _count: ProjectCounts;
}

export interface ProjectDetail extends ProjectListItem {
    owner: ProjectOwner;
    members: ProjectMember[];
}

export type CreateProjectPayload = CreateProjectFormValues;

export interface UpdateProjectPayload {
    name?: string;
    description?: string | null;
    status?: ProjectStatus;
}
