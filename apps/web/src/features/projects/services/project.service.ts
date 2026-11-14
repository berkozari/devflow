
import { apiClient } from "@/services/api";

import type {
    ApiResponse,
    PaginatedResponse,
} from "@/types/api.types";

import type {
    CreateProjectPayload,
    ProjectDetail,
    ProjectListItem,
    ProjectStatus,
    UpdateProjectPayload,
} from "../types/project.types";

import type {
    ProjectMember,
    AddProjectMemberPayload,
    UpdateProjectMemberPayload,
} from "../types/project-member.types";

export interface ProjectQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProjectStatus;
}

export const projectService = {
    async create(data: CreateProjectPayload) {
        const response = await apiClient.post<
            ApiResponse<ProjectListItem>
        >("/projects", data);

        return response.data;
    },

    async findAll(params?: ProjectQueryParams) {
        const response = await apiClient.get<
            PaginatedResponse<ProjectListItem>
        >("/projects", {
            params,
        });

        return response.data;
    },

    async findById(id: string) {
        const response = await apiClient.get<
            ApiResponse<ProjectDetail>
        >(`/projects/${id}`);

        return response.data;
    },

    async findMembers(projectId: string) {
        const response = await apiClient.get<
            ApiResponse<ProjectMember[]>
        >(`/projects/${projectId}/members`);

        return response.data;
    },

    async addMember(
        projectId: string,
        data: AddProjectMemberPayload,
    ) {
        const response = await apiClient.post<
            ApiResponse<ProjectMember>
        >(`/projects/${projectId}/members`, data);

        return response.data;
    },

    async updateMemberRole(
        projectId: string,
        userId: string,
        data: UpdateProjectMemberPayload,
    ) {
        const response = await apiClient.patch<
            ApiResponse<ProjectMember>
        >(`/projects/${projectId}/members/${userId}`, data);

        return response.data;
    },

    async removeMember(projectId: string, userId: string) {
        const response = await apiClient.delete<
            ApiResponse<never>
        >(`/projects/${projectId}/members/${userId}`);

        return response.data;
    },

    async update(
        id: string,
        data: UpdateProjectPayload,
    ) {
        const response = await apiClient.patch<
            ApiResponse<ProjectDetail>
        >(`/projects/${id}`, data);

        return response.data;
    },

    async delete(id: string) {
        const response = await apiClient.delete<
            ApiResponse<never>
        >(`/projects/${id}`);

        return response.data;
    },
};
