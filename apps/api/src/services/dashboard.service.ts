import { createHash } from "node:crypto";

import { dashboardRepository } from "../repositories/dashboard.repository.js";
import { AppError } from "../utils/app-error.js";
import { cache } from "../lib/cache.js";
import { logger } from "../lib/logger.js";

import type { DashboardQueryInput } from "../schemas/dashboard.schema.js";

const CACHE_TTL = {
    overview: 60,
    overdue: 60,
    workload: 120,
    activities: 30,
} as const;

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

function createCacheKey(
    resource: string,
    userId: string,
    projectIds: string[],
    query: DashboardQueryInput,
): string {
    const payload = JSON.stringify({
        projectIds: [...projectIds].sort(),
        query,
    });

    const hash = createHash("sha256")
        .update(payload)
        .digest("hex");

    return `dashboard:${resource}:${userId}:${hash}`;
}

function warnCacheFailure(
    operation: "read" | "write",
    error: unknown,
): void {
    // Avoid logging raw cache keys and arbitrary error messages.
    logger.warn(
        {
            operation,
            errorType: error instanceof Error ? error.name : "UnknownError",
        },
        "Dashboard cache operation failed; using database result",
    );
}

async function getCached<T>(
    key: string,
    ttl: number,
    loader: () => Promise<T>,
): Promise<T> {
    let cacheAvailable = true;

    try {
        const cached = await cache.get<T>(key);

        if (cached !== null) {
            return cached;
        }
    } catch (error) {
        cacheAvailable = false;
        warnCacheFailure("read", error);
    }

    // Database errors are intentionally NOT suppressed.
    const data = await loader();

    if (cacheAvailable) {
        try {
            await cache.set(key, data, ttl);
        } catch (error) {
            warnCacheFailure("write", error);
        }
    }

    return data;
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

        const key = createCacheKey(
            "overview",
            userId,
            projectIds,
            query,
        );

        return getCached(
            key,
            CACHE_TTL.overview,
            async () => {
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
                    dashboardRepository.getOverview(
                        projectIds,
                        query,
                    ),
                    dashboardRepository.getTasksByStatus(
                        projectIds,
                        query,
                    ),
                    dashboardRepository.getTasksByPriority(
                        projectIds,
                        query,
                    ),
                    dashboardRepository.getProjectProgress(
                        projectIds,
                        query,
                    ),
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
        );
    },

    async getOverdueTasks(
        userId: string,
        query: DashboardQueryInput,
    ) {
        const projectIds = await getAccessibleProjectIds(
            userId,
            query.projectId,
        );

        const key = createCacheKey(
            "overdue",
            userId,
            projectIds,
            query,
        );

        return getCached(
            key,
            CACHE_TTL.overdue,
            () => {
                if (projectIds.length === 0) {
                    return Promise.resolve([]);
                }

                return dashboardRepository.getOverdueTasks(
                    projectIds,
                    query,
                );
            },
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

        const key = createCacheKey(
            "workload",
            userId,
            projectIds,
            query,
        );

        return getCached(
            key,
            CACHE_TTL.workload,
            () => {
                if (projectIds.length === 0) {
                    return Promise.resolve([]);
                }

                return dashboardRepository.getUserWorkload(
                    projectIds,
                    query,
                );
            },
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

        const key = createCacheKey(
            "activities",
            userId,
            projectIds,
            query,
        );

        return getCached(
            key,
            CACHE_TTL.activities,
            () => {
                if (projectIds.length === 0) {
                    return Promise.resolve([]);
                }

                return dashboardRepository.getRecentActivities(
                    projectIds,
                    query,
                );
            },
        );
    },
};
