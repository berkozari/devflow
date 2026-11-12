
import { taskRepository } from "../repositories/task.repository.js";

import { projectMemberRepository } from "../repositories/project-member.repository.js";

import { AppError } from "../utils/app-error.js";

import type {
    CreateTaskInput,
    UpdateTaskInput,
    TaskQuery,
} from "../schemas/task.schema.js";

import type { ProjectRole } from "../generated/prisma/client.js";

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

export const taskService = {
    async create(
        projectId: string,
        userId: string,
        data: CreateTaskInput,
    ) {
        const member = await getProjectMember(
            projectId,
            userId,
        );

        if (!canManageTasks(member.role)) {
            throw new AppError(
                "You are not allowed to create tasks",
                403,
            );
        }

        await validateAssignee(
            projectId,
            data.assigneeId,
        );

        return taskRepository.create(
            projectId,
            userId,
            data,
        );
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
        const member = await getProjectMember(
            projectId,
            userId,
        );

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
            data.assigneeId !== undefined;

        const changesOwnershipFields =
            data.title !== undefined ||
            data.description !== undefined ||
            data.priority !== undefined ||
            data.dueDate !== undefined;

        const changesStatus = data.status !== undefined;

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

        if (
            !isManager &&
            !isCreator &&
            isAssignee &&
            changesStatus === false
        ) {
            throw new AppError(
                "You are not allowed to modify these task fields",
                403,
            );
        }

        await validateAssignee(
            projectId,
            data.assigneeId,
        );

        const result = await taskRepository.update(
            projectId,
            taskId,
            data,
        );

        if (result.count === 0) {
            throw new AppError("Task not found", 404);
        }

        return taskRepository.findById(
            projectId,
            taskId,
        );
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

        const result = await taskRepository.delete(
            projectId,
            taskId,
        );

        if (result.count === 0) {
            throw new AppError("Task not found", 404);
        }
    },
};
