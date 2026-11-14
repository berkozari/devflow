import { useQuery } from "@tanstack/react-query";

import { dashboardService } from "../services/dashboard.service";
import { dashboardKeys } from "./dashboard.keys";

import type { DashboardFilters } from "../types/dashboard.types";

export function useDashboard(filters: DashboardFilters = {}) {
    const overviewQuery = useQuery({
        queryKey: dashboardKeys.overview(filters),
        queryFn: () => dashboardService.getOverview(filters),
    });

    const overdueTasksQuery = useQuery({
        queryKey: dashboardKeys.overdueTasks(filters),
        queryFn: () => dashboardService.getOverdueTasks(filters),
    });

    const workloadQuery = useQuery({
        queryKey: dashboardKeys.workload(filters),
        queryFn: () => dashboardService.getWorkload(filters),
    });

    const activitiesQuery = useQuery({
        queryKey: dashboardKeys.activities(filters),
        queryFn: () => dashboardService.getActivities(filters),
    });

    return {
        overview: overviewQuery.data,
        overdueTasks: overdueTasksQuery.data ?? [],
        workload: workloadQuery.data ?? [],
        activities: activitiesQuery.data ?? [],

        isLoading:
            overviewQuery.isLoading ||
            overdueTasksQuery.isLoading ||
            workloadQuery.isLoading ||
            activitiesQuery.isLoading,

        isError:
            overviewQuery.isError ||
            overdueTasksQuery.isError ||
            workloadQuery.isError ||
            activitiesQuery.isError,

        error:
            overviewQuery.error ||
            overdueTasksQuery.error ||
            workloadQuery.error ||
            activitiesQuery.error,

        refetch: async () => {
            await Promise.all([
                overviewQuery.refetch(),
                overdueTasksQuery.refetch(),
                workloadQuery.refetch(),
                activitiesQuery.refetch(),
            ]);
        },
    };
}