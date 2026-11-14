export type DashboardDatePreset =
    | "7d"
    | "30d"
    | "90d"
    | "all";

export interface DashboardFilters {
    projectId?: string;
    startDate?: string;
    endDate?: string;
}

export interface DashboardProject {
    id: string;
    name: string;
}

export interface DashboardStatistics {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    unassignedTasks: number;
    completionRate: number;
}

export interface DashboardTaskStatus {
    status: string;
    _count: {
        _all: number;
    };
}

export interface DashboardTaskPriority {
    priority: string;
    _count: {
        _all: number;
    };
}

export interface DashboardProjectProgress {
    id: string;
    name: string;
    status: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
}

export interface DashboardOverview {
    statistics: DashboardStatistics;
    tasksByStatus: DashboardTaskStatus[];
    tasksByPriority: DashboardTaskPriority[];
    projectProgress: DashboardProjectProgress[];
}

export interface DashboardOverdueTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
    assignee: {
        id: string;
        name: string;
        email: string;
    } | null;
    project: {
        id: string;
        name: string;
    };
}

export interface DashboardWorkload {
    user: {
        id: string;
        name: string;
        email: string;
    };
    totalTasks: number;
}

export interface DashboardActivity {
    id: string;
    action: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    actor: {
        id: string;
        name: string;
    } | null;
    project: {
        id: string;
        name: string;
    };
    task: {
        id: string;
        title: string;
    } | null;
}

export interface DashboardData {
    overview: DashboardOverview;
    overdueTasks: DashboardOverdueTask[];
    workload: DashboardWorkload[];
    activities: DashboardActivity[];
}

export interface DashboardQueryParams {
    projectId?: string;
    startDate?: string;
    endDate?: string;
}