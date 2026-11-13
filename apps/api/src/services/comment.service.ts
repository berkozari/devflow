
import { prisma } from "../config/database.js";

import { commentRepository } from "../repositories/comment.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { projectMemberRepository } from "../repositories/project-member.repository.js";
import { activityRepository } from "../repositories/activity.repository.js";

import { AppError } from "../utils/app-error.js";

import type {
    CreateCommentInput,
    UpdateCommentInput,
    CommentQuery,
} from "../schemas/comment.schema.js";

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

async function getTask(
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

export const commentService = {
    async create(
        projectId: string,
        taskId: string,
        userId: string,
        data: CreateCommentInput,
    ) {
        await getProjectMember(projectId, userId);
        await getTask(projectId, taskId);

        const mentionedUserIds = [
            ...new Set(data.mentionedUserIds ?? []),
        ];

        if (mentionedUserIds.length > 0) {
            const members =
                await projectMemberRepository.findProjectMembersByUserIds(
                    projectId,
                    mentionedUserIds,
                );

            if (members.length !== mentionedUserIds.length) {
                throw new AppError(
                    "One or more mentioned users are not project members",
                    400,
                );
            }
        }

        return prisma.$transaction(async (tx) => {
            const comment = await commentRepository.create(
                taskId,
                userId,
                {
                    ...data,
                    mentionedUserIds,
                },
                tx,
            );

            await activityRepository.create(tx, {
                action: "COMMENT_CREATED",
                projectId,
                actorId: userId,
                taskId,
                metadata: {
                    commentId: comment.id,
                    content: comment.content,
                },
            });

            return comment;
        });
    },

    async findMany(
        projectId: string,
        taskId: string,
        userId: string,
        query: CommentQuery,
    ) {
        await getProjectMember(projectId, userId);
        await getTask(projectId, taskId);

        const [comments, total] =
            await commentRepository.findMany(
                taskId,
                query,
            );

        return {
            comments,
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

    async findById(
        projectId: string,
        taskId: string,
        commentId: string,
        userId: string,
    ) {
        await getProjectMember(projectId, userId);
        await getTask(projectId, taskId);

        const comment = await commentRepository.findById(
            taskId,
            commentId,
        );

        if (!comment) {
            throw new AppError("Comment not found", 404);
        }

        return comment;
    },

    async update(
        projectId: string,
        taskId: string,
        commentId: string,
        userId: string,
        data: UpdateCommentInput,
    ) {
        await getProjectMember(projectId, userId);
        await getTask(projectId, taskId);

        const comment = await commentRepository.findById(
            taskId,
            commentId,
        );

        if (!comment) {
            throw new AppError("Comment not found", 404);
        }

        if (comment.authorId !== userId) {
            throw new AppError(
                "You are not allowed to update this comment",
                403,
            );
        }

        await prisma.$transaction(async (tx) => {
            const result = await commentRepository.update(
                taskId,
                commentId,
                data,
                tx,
            );

            if (result.count === 0) {
                throw new AppError("Comment not found", 404);
            }

            await activityRepository.create(tx, {
                action: "COMMENT_UPDATED",
                projectId,
                actorId: userId,
                taskId,
                metadata: {
                    commentId,
                    oldContent: comment.content,
                    newContent: data.content,
                },
            });
        });

        return commentRepository.findById(
            taskId,
            commentId,
        );
    },

    async delete(
        projectId: string,
        taskId: string,
        commentId: string,
        userId: string,
    ) {
        await getProjectMember(projectId, userId);
        await getTask(projectId, taskId);

        const comment = await commentRepository.findById(
            taskId,
            commentId,
        );

        if (!comment) {
            throw new AppError("Comment not found", 404);
        }

        if (comment.authorId !== userId) {
            throw new AppError(
                "You are not allowed to delete this comment",
                403,
            );
        }

        await prisma.$transaction(async (tx) => {
            await activityRepository.create(tx, {
                action: "COMMENT_DELETED",
                projectId,
                actorId: userId,
                taskId,
                metadata: {
                    commentId,
                    content: comment.content,
                },
            });

            const result = await commentRepository.delete(
                taskId,
                commentId,
                tx,
            );

            if (result.count === 0) {
                throw new AppError("Comment not found", 404);
            }
        });
    },
};
