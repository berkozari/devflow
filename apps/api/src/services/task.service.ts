import { prisma } from "../config/database.js";

import { taskRepository } from "../repositories/task.repository.js";
import { activityRepository } from "../repositories/activity.repository.js";
import { projectMemberRepository } from "../repositories/project-member.repository.js";

import { notificationService } from "./notification.service.js";
import { AppError } from "../utils/app-error.js";

import type {
    CreateTaskInput,
    UpdateTaskInput,
    TaskQuery,
    MoveTaskInput,
} from "../schemas/task.schema.js";

import type {
    ProjectRole,
    ActivityAction,
    Prisma,
    TaskStatus,
} from "../generated/prisma/client.js";

type PositionedTask = {
    id: string;
    status: TaskStatus;
    position: number;
    assigneeId: string | null;
    completedAt: Date | null;
};

type PositionUpdate = {
    id: string;
    status: TaskStatus;
    position: number;
    completedAt?: Date | null;
};

async function getProjectMember(projectId: string, userId: string) {
    const member = await projectMemberRepository.findProjectMember(
        projectId,
        userId,
    );

    if (!member) {
        // Do not disclose whether an inaccessible project exists.
        throw new AppError("Project not found", 404);
    }

    return member;
}

function canManageTasks(role: ProjectRole): boolean {
    return role === "OWNER" || role === "ADMIN";
}

function canMoveTask(
    role: ProjectRole,
    task: { assigneeId: string | null },
    userId: string,
): boolean {
    return canManageTasks(role) ||
        (role === "MEMBER" && task.assigneeId === userId);
}

async function validateAssignee(
    projectId: string,
    assigneeId: string | null | undefined,
) {
    if (!assigneeId) return;

    const member = await projectMemberRepository.findProjectMember(
        projectId,
        assigneeId,
    );

    if (!member) {
        throw new AppError("Assignee must be a project member", 400);
    }
}

async function createActivity(
    tx: Prisma.TransactionClient,
    data: {
        action: ActivityAction;
        projectId: string;
        actorId: string;
        taskId: string;
        metadata?: Prisma.InputJsonValue;
    },
) {
    return activityRepository.create(tx, data);
}

function getCompletedAt(
    currentStatus: TaskStatus,
    nextStatus: TaskStatus,
    currentCompletedAt: Date | null,
): Date | null {
    if (nextStatus !== "DONE") return null;
    if (currentStatus === "DONE") return currentCompletedAt;
    return new Date();
}

async function lockTaskOrdering(
    projectId: string,
    tx: Prisma.TransactionClient,
) {
    const exists = await taskRepository.lockProjectTaskOrdering(
        projectId,
        tx,
    );

    if (!exists) {
        throw new AppError("Project not found", 404);
    }
}

/**
 * Shared status/order operation. The caller MUST hold the project row lock
 * in the same transaction and perform authorization before calling this.
 */
async function reorderTask(
    projectId: string,
    task: PositionedTask,
    targetStatus: TaskStatus,
    beforeTaskId: string | null,
    tx: Prisma.TransactionClient,
): Promise<{ oldPosition: number; newPosition: number }> {
    const sourceTasks = await taskRepository.findByStatus(
        projectId,
        task.status,
        tx,
    );

    if (!sourceTasks.some((item) => item.id === task.id)) {
        throw new AppError("Task not found", 404);
    }

    const targetTasks = task.status === targetStatus
        ? sourceTasks
        : await taskRepository.findByStatus(
            projectId,
            targetStatus,
            tx,
        );

    const sourceWithoutTask = sourceTasks.filter(
        (item) => item.id !== task.id,
    );

    const targetWithoutTask = task.status === targetStatus
        ? sourceWithoutTask
        : targetTasks;

    let insertIndex = targetWithoutTask.length;

    if (beforeTaskId !== null) {
        if (beforeTaskId === task.id) {
            throw new AppError("A task cannot be moved before itself", 400);
        }

        const targetIndex = targetWithoutTask.findIndex(
            (item) => item.id === beforeTaskId,
        );

        if (targetIndex === -1) {
            throw new AppError(
                "Target task not found in destination column",
                400,
            );
        }

        insertIndex = targetIndex;
    }

    const orderedTargetIds = targetWithoutTask.map((item) => item.id);
    orderedTargetIds.splice(insertIndex, 0, task.id);

    const positionUpdates: PositionUpdate[] = [];

    // Compact the source column when crossing columns.
    if (task.status !== targetStatus) {
        sourceWithoutTask.forEach((item, index) => {
            positionUpdates.push({
                id: item.id,
                status: task.status,
                position: index,
            });
        });
    }

    orderedTargetIds.forEach((id, index) => {
        positionUpdates.push({
            id,
            status: targetStatus,
            position: index,
            ...(id === task.id && {
                completedAt: getCompletedAt(
                    task.status,
                    targetStatus,
                    task.completedAt,
                ),
            }),
        });
    });

    const updatedCount = await taskRepository.updatePositions(
        projectId,
        positionUpdates,
        tx,
    );

    if (updatedCount !== positionUpdates.length) {
        throw new AppError("Task not found or move failed", 404);
    }

    return {
        oldPosition: task.position,
        newPosition: insertIndex,
    };
}

export const taskService = {
    async create(
        projectId: string,
        userId: string,
        data: CreateTaskInput,
    ) {
        const member = await getProjectMember(projectId, userId);

        if (!canManageTasks(member.role)) {
            throw new AppError("You are not allowed to create tasks", 403);
        }

        await validateAssignee(projectId, data.assigneeId);

        return prisma.$transaction(async (tx) => {
            await lockTaskOrdering(projectId, tx);

            const lastTask = await taskRepository.getLastPosition(
                projectId,
                data.status ?? "TODO",
                tx,
            );

            const position = lastTask ? lastTask.position + 1 : 0;

            const task = await taskRepository.create(
                projectId,
                userId,
                data,
                position,
                tx,
            );

            await createActivity(tx, {
                action: "TASK_CREATED",
                projectId,
                actorId: userId,
                taskId: task.id,
                metadata: {
                    title: task.title,
                    status: task.status,
                    priority: task.priority,
                    assigneeId: task.assigneeId,
                },
            });

            if (task.assigneeId && task.assigneeId !== userId) {
                await notificationService.create(tx, {
                    type: "TASK_ASSIGNED",
                    title: "New task assigned",
                    message: `You have been assigned to "${task.title}"`,
                    userId: task.assigneeId,
                    actorId: userId,
                    projectId,
                    taskId: task.id,
                });
            }

            return task;
        });
    },

    async findMany(
        projectId: string,
        userId: string,
        query: TaskQuery,
    ) {
        await getProjectMember(projectId, userId);

        const { tasks, total } = await taskRepository.findMany(
            projectId,
            query,
        );

        return {
            tasks,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        };
    },

    async findById(projectId: string, taskId: string, userId: string) {
        await getProjectMember(projectId, userId);

        const task = await taskRepository.findById(projectId, taskId);

        if (!task) {
            throw new AppError("Task not found", 404);
        }

        return task;
    },

    async update(
        projectId: string,
        taskId: string,
        userId: string,
        data: UpdateTaskInput,
    ) {
        const member = await getProjectMember(projectId, userId);

        return prisma.$transaction(async (tx) => {
            // Lock before reading task fields and positions, avoiding stale reads.
            await lockTaskOrdering(projectId, tx);

            const task = await taskRepository.findById(
                projectId,
                taskId,
                tx,
            );

            if (!task) {
                throw new AppError("Task not found", 404);
            }

            const isManager = canManageTasks(member.role);
            const isCreator = task.creatorId === userId;
            const isAssignee = task.assigneeId === userId;

            if (!isManager && !isCreator && !isAssignee) {
                throw new AppError(
                    "You are not allowed to update this task",
                    403,
                );
            }

            const changesAssignment =
                data.assigneeId !== undefined &&
                data.assigneeId !== task.assigneeId;

            const changesOwnershipFields =
                data.title !== undefined ||
                data.description !== undefined ||
                data.priority !== undefined ||
                data.dueDate !== undefined;

            const changesStatus =
                data.status !== undefined &&
                data.status !== task.status;

            if (
                !isManager &&
                !isCreator &&
                (changesAssignment || changesOwnershipFields)
            ) {
                throw new AppError(
                    "You are not allowed to modify these task fields",
                    403,
                );
            }

            // Both PATCH /:taskId and PATCH /:taskId/move use the same rule.
            if (changesStatus && !canMoveTask(member.role, task, userId)) {
                throw new AppError(
                    "You are not allowed to move this task",
                    403,
                );
            }

            await validateAssignee(projectId, data.assigneeId);

            const activities: Array<{
                action: ActivityAction;
                metadata: Prisma.InputJsonValue;
            }> = [];

            const hasGeneralChanges =
                data.title !== undefined ||
                data.description !== undefined ||
                data.dueDate !== undefined;

            if (hasGeneralChanges) {
                activities.push({
                    action: "TASK_UPDATED",
                    metadata: {
                        old: {
                            title: task.title,
                            description: task.description,
                            dueDate: task.dueDate?.toISOString() ?? null,
                        },
                        new: {
                            title: data.title ?? task.title,
                            description: data.description !== undefined
                                ? data.description
                                : task.description,
                            dueDate: data.dueDate !== undefined
                                ? data.dueDate
                                : task.dueDate?.toISOString() ?? null,
                        },
                    },
                });
            }

            if (changesStatus) {
                activities.push({
                    action: "TASK_STATUS_CHANGED",
                    metadata: {
                        oldStatus: task.status,
                        newStatus: data.status!,
                    },
                });
            }

            if (
                data.priority !== undefined &&
                data.priority !== task.priority
            ) {
                activities.push({
                    action: "TASK_PRIORITY_CHANGED",
                    metadata: {
                        oldPriority: task.priority,
                        newPriority: data.priority,
                    },
                });
            }

            if (changesAssignment) {
                activities.push({
                    action: "TASK_ASSIGNED",
                    metadata: {
                        oldAssigneeId: task.assigneeId,
                        newAssigneeId: data.assigneeId,
                    },
                });
            }

            if (changesStatus) {
                await reorderTask(
                    projectId,
                    task,
                    data.status!,
                    null, // PATCH status change appends to the destination column.
                    tx,
                );
            }

            const regularFields: Omit<UpdateTaskInput, "status"> = {
                title: data.title,
                description: data.description,
                priority: data.priority,
                assigneeId: data.assigneeId,
                dueDate: data.dueDate,
            };

            const hasRegularChanges =
                data.title !== undefined ||
                data.description !== undefined ||
                data.priority !== undefined ||
                data.assigneeId !== undefined ||
                data.dueDate !== undefined;

            if (hasRegularChanges) {
                const result = await taskRepository.update(
                    projectId,
                    taskId,
                    regularFields,
                    tx,
                );

                if (result.count !== 1) {
                    throw new AppError("Task not found", 404);
                }
            }

            for (const activity of activities) {
                await createActivity(tx, {
                    action: activity.action,
                    projectId,
                    actorId: userId,
                    taskId,
                    metadata: activity.metadata,
                });
            }

            if (
                changesAssignment &&
                data.assigneeId &&
                data.assigneeId !== userId
            ) {
                await notificationService.create(tx, {
                    type: "TASK_ASSIGNED",
                    title: "New task assigned",
                    message: `You have been assigned to "${data.title ?? task.title}"`,
                    userId: data.assigneeId,
                    actorId: userId,
                    projectId,
                    taskId,
                });
            }

            const updatedTask = await taskRepository.findUpdatedById(
                projectId,
                taskId,
                tx,
            );

            if (!updatedTask) {
                throw new AppError("Task not found", 404);
            }

            return updatedTask;
        });
    },

    async move(
        projectId: string,
        taskId: string,
        userId: string,
        data: MoveTaskInput,
    ) {
        const member = await getProjectMember(projectId, userId);

        return prisma.$transaction(async (tx) => {
            await lockTaskOrdering(projectId, tx);

            const task = await taskRepository.findPositionById(
                projectId,
                taskId,
                tx,
            );

            if (!task) {
                throw new AppError("Task not found", 404);
            }

            if (!canMoveTask(member.role, task, userId)) {
                throw new AppError(
                    "You are not allowed to move this task",
                    403,
                );
            }

            const { oldPosition, newPosition } = await reorderTask(
                projectId,
                task,
                data.status,
                data.beforeTaskId,
                tx,
            );

            if (task.status !== data.status) {
                await createActivity(tx, {
                    action: "TASK_STATUS_CHANGED",
                    projectId,
                    actorId: userId,
                    taskId,
                    metadata: {
                        oldStatus: task.status,
                        newStatus: data.status,
                        oldPosition,
                        newPosition,
                    },
                });
            }

            const updatedTask = await taskRepository.findUpdatedById(
                projectId,
                taskId,
                tx,
            );

            if (!updatedTask) {
                throw new AppError("Task not found", 404);
            }

            return updatedTask;
        });
    },

    async delete(projectId: string, taskId: string, userId: string) {
        const member = await getProjectMember(projectId, userId);

        if (!canManageTasks(member.role)) {
            throw new AppError(
                "You are not allowed to delete tasks",
                403,
            );
        }

        await prisma.$transaction(async (tx) => {
            await lockTaskOrdering(projectId, tx);

            const task = await taskRepository.findById(
                projectId,
                taskId,
                tx,
            );

            if (!task) {
                throw new AppError("Task not found", 404);
            }

            await createActivity(tx, {
                action: "TASK_DELETED",
                projectId,
                actorId: userId,
                taskId,
                metadata: {
                    title: task.title,
                    status: task.status,
                    priority: task.priority,
                },
            });

            const result = await taskRepository.delete(
                projectId,
                taskId,
                tx,
            );

            if (result.count !== 1) {
                throw new AppError("Task not found", 404);
            }

            // Keep positions contiguous after deletion, under the same lock.
            const remaining = await taskRepository.findByStatus(
                projectId,
                task.status,
                tx,
            );

            const updates: PositionUpdate[] = remaining.map((item, index) => ({
                id: item.id,
                status: task.status,
                position: index,
            }));

            const updatedCount = await taskRepository.updatePositions(
                projectId,
                updates,
                tx,
            );

            if (updatedCount !== updates.length) {
                throw new AppError("Failed to reorder tasks", 500);
            }
        });

        return { success: true };
    },
};
