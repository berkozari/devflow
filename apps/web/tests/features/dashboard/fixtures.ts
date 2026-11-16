import type {
    DashboardActivity,
    DashboardFilters,
    DashboardOverview,
    DashboardOverdueTask,
    DashboardWorkload,
} from "@/features/dashboard/types/dashboard.types";

export const dashboardFilters: DashboardFilters = {
    projectId: "project-1",
    startDate: "2026-10-01T00:00:00.000Z",
    endDate: "2026-10-31T23:59:59.999Z",
};

export function makeOverview(
    overrides: Partial<DashboardOverview> = {},
): DashboardOverview {
    return {
        statistics: {
            totalProjects: 3,
            activeProjects: 2,
            completedProjects: 1,
            totalTasks: 10,
            completedTasks: 6,
            overdueTasks: 2,
            unassignedTasks: 1,
            completionRate: 60,
        },
        tasksByStatus: [
            { status: "TODO", _count: { _all: 4 } },
            { status: "DONE", _count: { _all: 6 } },
        ],
        tasksByPriority: [
            { priority: "HIGH", _count: { _all: 5 } },
            { priority: "LOW", _count: { _all: 5 } },
        ],
        projectProgress: [
            {
                id: "project-1",
                name: "Alpha",
                status: "ACTIVE",
                totalTasks: 10,
                completedTasks: 6,
                completionRate: 60,
            },
        ],
        ...overrides,
    };
}

export function makeOverdueTask(
    overrides: Partial<DashboardOverdueTask> = {},
): DashboardOverdueTask {
    return {
        id: "task-1",
        title: "Fix release bug",
        status: "TODO",
        priority: "HIGH",
        dueDate: "2026-10-20T12:00:00.000Z",
        assignee: {
            id: "user-1",
            name: "Ada",
            email: "ada@example.com",
        },
        project: { id: "project-1", name: "Alpha" },
        ...overrides,
    };
}

export function makeWorkload(
    overrides: Partial<DashboardWorkload> = {},
): DashboardWorkload {
    return {
        user: { id: "user-1", name: "Ada", email: "ada@example.com" },
        totalTasks: 5,
        ...overrides,
    };
}

export function makeActivity(
    overrides: Partial<DashboardActivity> = {},
): DashboardActivity {
    return {
        id: "activity-1",
        action: "TASK_CREATED",
        metadata: null,
        createdAt: "2026-10-20T09:00:00.000Z",
        actor: { id: "user-1", name: "Ada" },
        project: { id: "project-1", name: "Alpha" },
        task: { id: "task-1", title: "Fix release bug" },
        ...overrides,
    };
}
