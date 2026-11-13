
import { prisma } from "../config/database.js";

import { mentionRepository } from "../repositories/mention.repository.js";
import { commentRepository } from "../repositories/comment.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { projectMemberRepository } from "../repositories/project-member.repository.js";

import { AppError } from "../utils/app-error.js";

import type { CreateMentionInput } from "../schemas/mention.schema.js";

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

export const mentionService = {
    async create(
        projectId: string,
        taskId: string,
        commentId: string,
        userId: string,
        data: CreateMentionInput,
    ) {
        await getProjectMember(projectId, userId);

        const task = await taskRepository.findById(
            projectId,
            taskId,
        );

        if (!task) {
            throw new AppError("Task not found", 404);
        }

        const comment = await commentRepository.findById(
            taskId,
            commentId,
        );

        if (!comment) {
            throw new AppError("Comment not found", 404);
        }

        if (comment.authorId !== userId) {
            throw new AppError(
                "Only the comment author can manage mentions",
                403,
            );
        }

        const uniqueUserIds = [...new Set(data.userIds)];

        if (uniqueUserIds.includes(userId)) {
            throw new AppError(
                "You cannot mention yourself",
                400,
            );
        }

        const members = await Promise.all(
            uniqueUserIds.map((mentionedUserId) =>
                projectMemberRepository.findProjectMember(
                    projectId,
                    mentionedUserId,
                ),
            ),
        );

        if (members.some((member) => !member)) {
            throw new AppError(
                "All mentioned users must be project members",
                400,
            );
        }

        return prisma.$transaction(async (tx) => {
            await mentionRepository.createMany(
                commentId,
                uniqueUserIds,
                userId,
                tx,
            );

            return mentionRepository.findByCommentId(
                commentId,
                tx,
            );
        });
    },

    async findByComment(
        projectId: string,
        taskId: string,
        commentId: string,
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

        const comment = await commentRepository.findById(
            taskId,
            commentId,
        );

        if (!comment) {
            throw new AppError("Comment not found", 404);
        }

        return mentionRepository.findByCommentId(commentId);
    },

    async deleteByComment(
        projectId: string,
        taskId: string,
        commentId: string,
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

        const comment = await commentRepository.findById(
            taskId,
            commentId,
        );

        if (!comment) {
            throw new AppError("Comment not found", 404);
        }

        if (comment.authorId !== userId) {
            throw new AppError(
                "Only the comment author can manage mentions",
                403,
            );
        }

        return mentionRepository.deleteByCommentId(commentId);
    },
};
