
import type {
    CreateProjectFormValues,
} from "../schemas/project.schema";

import type {
    ProjectMember,
} from "./project-member.types";

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

export type { ProjectMember };

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
