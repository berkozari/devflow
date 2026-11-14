
export type TaskStatus =
    | "TODO"
    | "IN_PROGRESS"
    | "IN_REVIEW"
    | "DONE";

export type TaskPriority =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "URGENT";

export interface TaskUser {
    id: string;
    name: string;
    email: string;
}

export interface Task {
    id: string;
    projectId: string;
    creatorId: string;
    assigneeId: string | null;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    position: number;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
    assignee: TaskUser | null;
    creator: TaskUser;
}

export interface CreateTaskPayload {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
}

export interface UpdateTaskPayload {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
}

export interface MoveTaskPayload {
    status: TaskStatus;
    beforeTaskId: string | null;
}

export interface TaskFilters {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: "createdAt" | "updatedAt" | "dueDate" | "title";
    sortOrder?: "asc" | "desc";
}

export interface TaskPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface TaskListResponse {
    success: boolean;
    data: Task[];
    pagination: TaskPagination;
}

export interface TaskResponse {
    success: boolean;
    data: Task;
}

export interface KanbanColumn {
    id: TaskStatus;
    title: string;
    tasks: Task[];
}
