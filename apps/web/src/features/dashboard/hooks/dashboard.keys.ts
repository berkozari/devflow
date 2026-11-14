import type { DashboardFilters } from "../types/dashboard.types";

export const dashboardKeys = {
    all: ["dashboard"] as const,

    overview: (filters: DashboardFilters) =>
        [...dashboardKeys.all, "overview", filters] as const,

    overdueTasks: (filters: DashboardFilters) =>
        [...dashboardKeys.all, "overdue-tasks", filters] as const,

    workload: (filters: DashboardFilters) =>
        [...dashboardKeys.all, "workload", filters] as const,

    activities: (filters: DashboardFilters) =>
        [...dashboardKeys.all, "activities", filters] as const,
};