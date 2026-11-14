
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

async function getProjectMember(
    projectId: string,
    userId: string,
) {
    const member = await projectMemberRepository.findProjectMember(
        projectId,
        userId,
    );

    if (!member) {
        throw new AppError("Project not found", 404);
    }

    return member;
}

function canManageTasks(role: ProjectRole) {
    return role === "OWNER" || role === "ADMIN";
}

async function validateAssignee(
    projectId: string,
    assigneeId: string | null | undefined,
) {
    if (!assigneeId) {
        return;
    }

    const member = await projectMemberRepository.findProjectMember(
        projectId,
        assigneeId,
    );

    if (!member) {
        throw new AppError(
            "Assignee must be a project member",
            400,
        );
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

function canMoveTask(
    role: string,
    task: { assigneeId: string | null },
    userId: string,
): boolean {
    if (role === "OWNER" || role === "ADMIN") {
        return true;
    }

    if (role === "MEMBER") {
        return task.assigneeId === userId;
    }

    return false;
}

function getCompletedAt(
    currentStatus: TaskStatus,
    nextStatus: TaskStatus,
    currentCompletedAt: Date | null,
): Date | null {
    if (nextStatus !== "DONE") {
        return null;
    }

    if (currentStatus === "DONE") {
        return currentCompletedAt;
    }

    return new Date();
}

export const taskService = {
    async create(
        projectId: string,
        userId: string,
        data: CreateTaskInput,
    ) {
        const member = await getProjectMember(projectId, userId);

        if (!canManageTasks(member.role)) {
            throw new AppError(
                "You are not allowed to create tasks",
                403,
            );
        }

        await validateAssignee(projectId, data.assigneeId);

        return prisma.$transaction(async (tx) => {
            const lastTask = await taskRepository.getLastPosition(
                projectId,
                data.status ?? "TODO",
                tx,
            );

            const position = lastTask
                ? lastTask.position + 1
                : 0;

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

            if (
                task.assigneeId &&
                task.assigneeId !== userId
            ) {
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

    async findById(
        projectId: string,
        taskId: string,
        userId: string,
    ) {
        await getProjectMember(projectId, userId);

        const task = await taskRepository.findById(
            projectId,
            taskId,
        );

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

        const task = await taskRepository.findById(
            projectId,
            taskId,
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

        await validateAssignee(projectId, data.assigneeId);

        const activities: {
            action: ActivityAction;
            metadata: Prisma.InputJsonValue;
        }[] = [];

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
                        description:
                            data.description !== undefined
                                ? data.description
                                : task.description,
                        dueDate:
                            data.dueDate !== undefined
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

        return prisma.$transaction(async (tx) => {
            const completedAt = changesStatus
                ? getCompletedAt(
                    task.status,
                    data.status!,
                    task.completedAt,
                )
                : undefined;

            const result = await taskRepository.update(
                projectId,
                taskId,
                data,
                tx,
                completedAt
            );

            if (result.count === 0) {
                throw new AppError("Task not found", 404);
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
            // Serialize task ordering operations within this project.
            await tx.$executeRaw`
                SELECT pg_advisory_xact_lock(
                    hashtext(${projectId})::bigint)
            `;

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

            const sourceStatus = task.status;
            const targetStatus = data.status;

            const completedAt = getCompletedAt(
                sourceStatus,
                targetStatus,
                task.completedAt,
            );

            const sourceTasks = await taskRepository.findByStatus(
                projectId,
                sourceStatus,
                tx,
            );

            const targetTasks =
                sourceStatus === targetStatus
                    ? sourceTasks
                    : await taskRepository.findByStatus(
                        projectId,
                        targetStatus,
                        tx,
                    );

            const sourceWithoutTask = sourceTasks.filter(
                (item) => item.id !== taskId,
            );

            const targetTasksWithoutTask =
                sourceStatus === targetStatus
                    ? sourceWithoutTask
                    : targetTasks;

            let insertIndex = targetTasksWithoutTask.length;

            if (data.beforeTaskId !== null) {
                if (data.beforeTaskId === taskId) {
                    throw new AppError(
                        "A task cannot be moved before itself",
                        400,
                    );
                }

                const beforeIndex = targetTasksWithoutTask.findIndex(
                    (item) => item.id === data.beforeTaskId,
                );

                if (beforeIndex === -1) {
                    throw new AppError(
                        "Target task not found in destination column",
                        400,
                    );
                }

                insertIndex = beforeIndex;
            }

            const newTargetTasks = [...targetTasksWithoutTask];

            newTargetTasks.splice(insertIndex, 0, {
                id: taskId,
                position: 0,
            });

            // First assign temporary unique negative positions.
            const affectedTasks =
                sourceStatus === targetStatus
                    ? newTargetTasks
                    : [...sourceTasks, ...targetTasks];

            for (let index = 0; index < affectedTasks.length; index++) {
                await tx.task.update({
                    where: {
                        id: affectedTasks[index].id,
                    },
                    data: {
                        position: -(index + 1),
                    },
                });
            }

            // Update source column positions when changing columns.
            if (sourceStatus !== targetStatus) {
                for (
                    let index = 0;
                    index < sourceWithoutTask.length;
                    index++
                ) {
                    await tx.task.update({
                        where: {
                            id: newTargetTasks[index].id,
                        },
                        data: {
                            status: targetStatus,
                            position: index,

                            ...(newTargetTasks[index].id === taskId && {
                                completedAt,
                            }),
                        },
                    });
                }
            }

            // Update destination column positions.
            for (
                let index = 0;
                index < newTargetTasks.length;
                index++
            ) {
                await tx.task.update({
                    where: {
                        id: newTargetTasks[index].id,
                    },
                    data: {
                        status: targetStatus,
                        position: index,
                    },
                });
            }

            if (sourceStatus !== targetStatus) {
                await createActivity(tx, {
                    action: "TASK_STATUS_CHANGED",
                    projectId,
                    actorId: userId,
                    taskId,
                    metadata: {
                        oldStatus: sourceStatus,
                        newStatus: targetStatus,
                        oldPosition: task.position,
                        newPosition: insertIndex,
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

    async delete(
        projectId: string,
        taskId: string,
        userId: string,
    ) {
        const member = await getProjectMember(
            projectId,
            userId,
        );

        if (!canManageTasks(member.role)) {
            throw new AppError(
                "You are not allowed to delete tasks",
                403,
            );
        }

        const task = await taskRepository.findById(
            projectId,
            taskId,
        );

        if (!task) {
            throw new AppError("Task not found", 404);
        }

        await prisma.$transaction(async (tx) => {
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

            if (result.count === 0) {
                throw new AppError("Task not found", 404);
            }
        });

        return { success: true };
    },
};
