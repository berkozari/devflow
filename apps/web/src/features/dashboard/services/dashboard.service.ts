import { apiClient } from "@/services/api";

import type {
    DashboardFilters,
    DashboardOverview,
    DashboardOverdueTask,
    DashboardWorkload,
    DashboardActivity,
} from "../types/dashboard.types";

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export const dashboardService = {
    async getOverview(
        filters: DashboardFilters,
    ): Promise<DashboardOverview> {
        const { data } = await apiClient.get<ApiResponse<DashboardOverview>>(
            "/dashboard/overview",
            { params: filters },
        );

        return data.data;
    },

    async getOverdueTasks(
        filters: DashboardFilters,
    ): Promise<DashboardOverdueTask[]> {
        const { data } = await apiClient.get<ApiResponse<DashboardOverdueTask[]>>(
            "/dashboard/overdue-tasks",
            { params: filters },
        );

        return data.data;
    },

    async getWorkload(
        filters: DashboardFilters,
    ): Promise<DashboardWorkload[]> {
        const { data } = await apiClient.get<ApiResponse<DashboardWorkload[]>>(
            "/dashboard/workload",
            { params: filters },
        );

        return data.data;
    },

    async getActivities(
        filters: DashboardFilters,
    ): Promise<DashboardActivity[]> {
        const { data } = await apiClient.get<ApiResponse<DashboardActivity[]>>(
            "/dashboard/activities",
            { params: filters },
        );

        return data.data;
    },
};