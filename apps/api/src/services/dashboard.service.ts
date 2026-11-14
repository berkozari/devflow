
import { dashboardRepository } from "../repositories/dashboard.repository.js";
import { AppError } from "../utils/app-error.js";

import type { DashboardQueryInput } from "../schemas/dashboard.schema.js";

async function getAccessibleProjectIds(
    userId: string,
    projectId?: string,
): Promise<string[]> {
    const projects = await dashboardRepository.findUserProjects(
        userId,
        projectId,
    );

    if (projectId && projects.length === 0) {
        throw new AppError("Project not found", 404);
    }

    return projects.map((project) => project.id);
}

export const dashboardService = {
    async getOverview(
        userId: string,
        query: DashboardQueryInput,
    ) {
        const projectIds = await getAccessibleProjectIds(
            userId,
            query.projectId,
        );

        if (projectIds.length === 0) {
            return {
                statistics: {
                    totalProjects: 0,
                    activeProjects: 0,
                    completedProjects: 0,
                    totalTasks: 0,
                    completedTasks: 0,
                    overdueTasks: 0,
                    unassignedTasks: 0,
                    completionRate: 0,
                },
                tasksByStatus: [],
                tasksByPriority: [],
                projectProgress: [],
            };
        }

        const [
            statistics,
            tasksByStatus,
            tasksByPriority,
            projectProgress,
        ] = await Promise.all([
            dashboardRepository.getOverview(projectIds, query),
            dashboardRepository.getTasksByStatus(projectIds, query),
            dashboardRepository.getTasksByPriority(projectIds, query),
            dashboardRepository.getProjectProgress(projectIds, query),
        ]);

        const completionRate =
            statistics.totalTasks > 0
                ? Number(
                    (
                        (statistics.completedTasks /
                            statistics.totalTasks) *
                        100
                    ).toFixed(2),
                )
                : 0;

        return {
            statistics: {
                ...statistics,
                completionRate,
            },
            tasksByStatus,
            tasksByPriority,
            projectProgress,
        };
    },

    async getOverdueTasks(
        userId: string,
        query: DashboardQueryInput,
    ) {
        const projectIds = await getAccessibleProjectIds(
            userId,
            query.projectId,
        );

        if (projectIds.length === 0) {
            return [];
        }

        return dashboardRepository.getOverdueTasks(
            projectIds,
            query,
        );
    },

    async getUserWorkload(
        userId: string,
        query: DashboardQueryInput,
    ) {
        const projectIds = await getAccessibleProjectIds(
            userId,
            query.projectId,
        );

        if (projectIds.length === 0) {
            return [];
        }

        return dashboardRepository.getUserWorkload(
            projectIds,
            query,
        );
    },

    async getRecentActivities(
        userId: string,
        query: DashboardQueryInput,
    ) {
        const projectIds = await getAccessibleProjectIds(
            userId,
            query.projectId,
        );

        if (projectIds.length === 0) {
            return [];
        }

        return dashboardRepository.getRecentActivities(
            projectIds,
            query,
        );
    },
};
