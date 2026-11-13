
import { activityRepository } from "../repositories/activity.repository.js";
import { projectMemberRepository } from "../repositories/project-member.repository.js";
import { taskRepository } from "../repositories/task.repository.js";

import { AppError } from "../utils/app-error.js";

import type { ActivityQuery } from "../schemas/activity.schema.js";

import type {
    Prisma,
    ActivityAction,
} from "../generated/prisma/client.js";

async function checkProjectMembership(
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

async function checkTask(
    projectId: string,
    taskId: string,
) {
    const task = await taskRepository.findById(
        projectId,
        taskId,
    );

    if (!task) {
        throw new AppError("Task not found", 404);
    }

    return task;
}

export const activityService = {
    async create(
        tx: Prisma.TransactionClient,
        data: {
            action: ActivityAction;
            projectId: string;
            actorId: string;
            taskId?: string;
            metadata?: Prisma.InputJsonValue;
        },
    ) {
        return activityRepository.create(tx, data);
    },

    async findMany(
        projectId: string,
        userId: string,
        query: ActivityQuery,
    ) {
        await checkProjectMembership(projectId, userId);

        const [activities, total] =
            await activityRepository.findMany(
                projectId,
                query,
            );

        return {
            activities,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(
                    total / query.limit,
                ),
            },
        };
    },

    async findTaskActivities(
        projectId: string,
        taskId: string,
        userId: string,
        query: ActivityQuery,
    ) {
        await checkProjectMembership(projectId, userId);

        await checkTask(projectId, taskId);

        const [activities, total] =
            await activityRepository.findMany(
                projectId,
                query,
                taskId,
            );

        return {
            activities,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(
                    total / query.limit,
                ),
            },
        };
    },
};
