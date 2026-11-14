
import type { Task } from "../types/task.types";

interface TaskPermissionContext {
    role: string;
    userId: string;
}

export function canManageTasks(role: string): boolean {
    return role === "OWNER" || role === "ADMIN";
}

export function canEditTask(
    task: Task,
    context: TaskPermissionContext,
): boolean {
    if (canManageTasks(context.role)) {
        return true;
    }

    if (context.role === "MEMBER") {
        return task.assigneeId === context.userId;
    }

    return false;
}

export function canEditTaskFields(
    task: Task,
    context: TaskPermissionContext,
): boolean {
    return canManageTasks(context.role);
}

export function canChangeTaskStatus(
    task: Task,
    context: TaskPermissionContext,
): boolean {
    return canEditTask(task, context);
}

export function canDeleteTask(role: string): boolean {
    return role === "OWNER";
}
