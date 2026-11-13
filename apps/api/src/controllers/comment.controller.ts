
import type { RequestHandler } from "express";

import { commentService } from "../services/comment.service.js";

import type {
    CreateCommentInput,
    UpdateCommentInput,
    CommentQuery,
} from "../schemas/comment.schema.js";

interface CommentParams {
    projectId: string;
    taskId: string;
    commentId?: string;
}

export const createComment: RequestHandler = async (req, res) => {
    const params = res.locals.validated!.params as CommentParams;
    const body = res.locals.validated!.body as CreateCommentInput;

    const comment = await commentService.create(
        params.projectId,
        params.taskId,
        req.user!.id,
        body,
    );

    res.status(201).json({
        success: true,
        message: "Comment created successfully",
        data: comment,
    });
};

export const getComments: RequestHandler = async (req, res) => {
    const params = res.locals.validated!.params as CommentParams;
    const query = res.locals.validated!.query as CommentQuery;

    const result = await commentService.findMany(
        params.projectId,
        params.taskId,
        req.user!.id,
        query,
    );

    res.status(200).json({
        success: true,
        data: result.comments,
        pagination: result.pagination,
    });
};

export const updateComment: RequestHandler = async (req, res) => {
    const params = res.locals.validated!.params as CommentParams;
    const body = res.locals.validated!.body as UpdateCommentInput;

    const comment = await commentService.update(
        params.projectId,
        params.taskId,
        params.commentId!,
        req.user!.id,
        body,
    );

    res.status(200).json({
        success: true,
        message: "Comment updated successfully",
        data: comment,
    });
};

export const deleteComment: RequestHandler = async (req, res) => {
    const params = res.locals.validated!.params as CommentParams;

    await commentService.delete(
        params.projectId,
        params.taskId,
        params.commentId!,
        req.user!.id,
    );

    res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
    });
};
