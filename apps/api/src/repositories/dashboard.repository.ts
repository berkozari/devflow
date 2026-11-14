
import { prisma } from "../config/database.js";

import type { DashboardQueryInput } from "../schemas/dashboard.schema.js";

function getCreatedAtFilter(query: DashboardQueryInput) {
    if (!query.startDate && !query.endDate) return {};

    return {
        createdAt: {
            ...(query.startDate && {
                gte: new Date(query.startDate),
            }),
            ...(query.endDate && {
                lte: new Date(query.endDate),
            }),
        },
    };
}

function getDueDateRange(query: DashboardQueryInput) {
    return {
        ...(query.startDate && {
            gte: new Date(query.startDate),
        }),
        ...(query.endDate && {
            lte: new Date(query.endDate),
        }),
    };
}

function getActivityDateFilter(query: DashboardQueryInput) {
    return getCreatedAtFilter(query);
}

export const dashboardRepository = {
    findUserProjects(userId: string, projectId?: string) {
        return prisma.project.findMany({
            where: {
                ...(projectId && { id: projectId }),
                OR: [
                    { ownerId: userId },
                    {
                        members: {
                            some: { userId },
                        },
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                status: true,
                createdAt: true,
            },
        });
    },

    async getOverview(
        projectIds: string[],
        query: DashboardQueryInput,
        now = new Date(),
    ) {
        const createdAtFilter = getCreatedAtFilter(query);

        const [
            totalProjects,
            activeProjects,
            completedProjects,
            totalTasks,
            completedTasks,
            overdueTasks,
            unassignedTasks,
        ] = await Promise.all([
            prisma.project.count({
                where: {
                    id: { in: projectIds },
                    ...createdAtFilter,
                },
            }),

            prisma.project.count({
                where: {
                    id: { in: projectIds },
                    status: "ACTIVE",
                    ...createdAtFilter,
                },
            }),

            prisma.project.count({
                where: {
                    id: { in: projectIds },
                    status: "COMPLETED",
                    ...createdAtFilter,
                },
            }),

            prisma.task.count({
                where: {
                    projectId: { in: projectIds },
                    ...createdAtFilter,
                },
            }),

            prisma.task.count({
                where: {
                    projectId: { in: projectIds },
                    status: "DONE",
                    ...createdAtFilter,
                },
            }),

            prisma.task.count({
                where: {
                    projectId: { in: projectIds },
                    status: { not: "DONE" },
                    dueDate: {
                        lt: now,
                        ...getDueDateRange(query),
                    },
                },
            }),

            prisma.task.count({
                where: {
                    projectId: { in: projectIds },
                    assigneeId: null,
                    status: { not: "DONE" },
                    ...createdAtFilter,
                },
            }),
        ]);

        return {
            totalProjects,
            activeProjects,
            completedProjects,
            totalTasks,
            completedTasks,
            overdueTasks,
            unassignedTasks,
        };
    },

    getTasksByStatus(
        projectIds: string[],
        query: DashboardQueryInput,
    ) {
        return prisma.task.groupBy({
            by: ["status"],
            where: {
                projectId: { in: projectIds },
                ...getCreatedAtFilter(query),
            },
            _count: {
                _all: true,
            },
        });
    },

    getTasksByPriority(
        projectIds: string[],
        query: DashboardQueryInput,
    ) {
        return prisma.task.groupBy({
            by: ["priority"],
            where: {
                projectId: { in: projectIds },
                ...getCreatedAtFilter(query),
            },
            _count: {
                _all: true,
            },
        });
    },

    getOverdueTasks(
        projectIds: string[],
        query: DashboardQueryInput,
        limit = 10,
        now = new Date(),
    ) {
        return prisma.task.findMany({
            where: {
                projectId: { in: projectIds },
                status: { not: "DONE" },
                dueDate: {
                    lt: now,
                    ...getDueDateRange(query),
                },
            },
            orderBy: {
                dueDate: "asc",
            },
            take: limit,
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    },

    async getUserWorkload(
        projectIds: string[],
        query: DashboardQueryInput,
    ) {
        const workload = await prisma.task.groupBy({
            by: ["assigneeId"],
            where: {
                projectId: { in: projectIds },
                assigneeId: { not: null },
                status: { not: "DONE" },
                ...getCreatedAtFilter(query),
            },
            _count: {
                _all: true,
            },
            orderBy: {
                _count: {
                    assigneeId: "desc",
                },
            },
        });

        if (workload.length === 0) {
            return [];
        }

        const userIds = workload
            .map((item) => item.assigneeId)
            .filter((id): id is string => id !== null);

        const users = await prisma.user.findMany({
            where: {
                id: { in: userIds },
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        const userMap = new Map(
            users.map((user) => [user.id, user]),
        );

        return workload.flatMap((item) => {
            if (!item.assigneeId) return [];

            const user = userMap.get(item.assigneeId);

            if (!user) return [];

            return [{
                user,
                totalTasks: item._count._all,
            }];
        });
    },

    getRecentActivities(
        projectIds: string[],
        query: DashboardQueryInput,
        limit = 10,
    ) {
        return prisma.activityLog.findMany({
            where: {
                projectId: { in: projectIds },
                ...getActivityDateFilter(query),
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            select: {
                id: true,
                action: true,
                metadata: true,
                createdAt: true,
                actor: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
    },

    async getProjectProgress(
        projectIds: string[],
        query: DashboardQueryInput,
    ) {
        const [projects, taskGroups] = await Promise.all([
            prisma.project.findMany({
                where: {
                    id: { in: projectIds },
                },
                select: {
                    id: true,
                    name: true,
                    status: true,
                },
            }),

            prisma.task.groupBy({
                by: ["projectId", "status"],
                where: {
                    projectId: { in: projectIds },
                    ...getCreatedAtFilter(query),
                },
                _count: {
                    _all: true,
                },
            }),
        ]);

        const taskMap = new Map<
            string,
            { totalTasks: number; completedTasks: number }
        >();

        for (const group of taskGroups) {
            const current = taskMap.get(group.projectId) ?? {
                totalTasks: 0,
                completedTasks: 0,
            };

            current.totalTasks += group._count._all;

            if (group.status === "DONE") {
                current.completedTasks += group._count._all;
            }

            taskMap.set(group.projectId, current);
        }

        return projects.map((project) => {
            const tasks = taskMap.get(project.id) ?? {
                totalTasks: 0,
                completedTasks: 0,
            };

            return {
                id: project.id,
                name: project.name,
                status: project.status,
                totalTasks: tasks.totalTasks,
                completedTasks: tasks.completedTasks,
                completionRate:
                    tasks.totalTasks > 0
                        ? Number(
                            (
                                (tasks.completedTasks /
                                    tasks.totalTasks) *
                                100
                            ).toFixed(2),
                        )
                        : 0,
            };
        });
    },
};
