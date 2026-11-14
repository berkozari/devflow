
import { apiClient } from "@/services/api";

import type { ApiResponse } from "@/types/api.types";

import type {
    TaskFilters,
    CreateTaskPayload,
    UpdateTaskPayload,
    MoveTaskPayload,
    TaskListResponse,
    TaskResponse,
} from "../types/task.types";

export const taskService = {
    async findAll(
        projectId: string,
        filters?: TaskFilters,
    ) {
        const response = await apiClient.get<TaskListResponse>(
            `/projects/${projectId}/tasks`,
            {
                params: filters,
            },
        );

        return response.data;
    },

    async findById(
        projectId: string,
        taskId: string,
    ) {
        const response = await apiClient.get<TaskResponse>(
            `/projects/${projectId}/tasks/${taskId}`,
        );

        return response.data;
    },

    async create(
        projectId: string,
        data: CreateTaskPayload,
    ) {
        const response = await apiClient.post<TaskResponse>(
            `/projects/${projectId}/tasks`,
            data,
        );

        return response.data;
    },

    async update(
        projectId: string,
        taskId: string,
        data: UpdateTaskPayload,
    ) {
        const response = await apiClient.patch<TaskResponse>(
            `/projects/${projectId}/tasks/${taskId}`,
            data,
        );

        return response.data;
    },

    async move(
        projectId: string,
        taskId: string,
        data: MoveTaskPayload,
    ) {
        const response = await apiClient.patch<TaskResponse>(
            `/projects/${projectId}/tasks/${taskId}/move`,
            data,
        );

        return response.data;
    },

    async remove(
        projectId: string,
        taskId: string,
    ) {
        const response = await apiClient.delete<ApiResponse<never>>(
            `/projects/${projectId}/tasks/${taskId}`,
        );

        return response.data;
    },
};
