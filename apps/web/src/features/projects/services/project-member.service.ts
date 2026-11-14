
import { apiClient } from "@/services/api";

import type { ApiResponse } from "@/types/api.types";

import type {
    ProjectMember,
    AddProjectMemberPayload,
    UpdateProjectMemberPayload,
} from "../types/project-member.types";

export const projectMemberService = {
    async findAll(projectId: string) {
        const response = await apiClient.get<
            ApiResponse<ProjectMember[]>
        >(`/projects/${projectId}/members`);

        return response.data;
    },

    async add(
        projectId: string,
        data: AddProjectMemberPayload,
    ) {
        const response = await apiClient.post<
            ApiResponse<ProjectMember>
        >(`/projects/${projectId}/members`, data);

        return response.data;
    },

    async update(
        projectId: string,
        userId: string,
        data: UpdateProjectMemberPayload,
    ) {
        const response = await apiClient.patch<
            ApiResponse<ProjectMember>
        >(`/projects/${projectId}/members/${userId}`, data);

        return response.data;
    },

    async remove(projectId: string, userId: string) {
        const response = await apiClient.delete<
            ApiResponse<never>
        >(`/projects/${projectId}/members/${userId}`);

        return response.data;
    },
};
