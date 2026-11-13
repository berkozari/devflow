
import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
    createComment,
    getComments,
    updateComment,
    deleteComment,
} from "../controllers/comment.controller.js";

import {
    createCommentSchema,
    updateCommentSchema,
    commentQuerySchema,
    commentRouteParamsSchema,
    commentItemParamsSchema,
} from "../schemas/comment.schema.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
    "/",
    validate({
        params: commentRouteParamsSchema,
        body: createCommentSchema,
    }),
    createComment,
);

router.get(
    "/",
    validate({
        params: commentRouteParamsSchema,
        query: commentQuerySchema,
    }),
    getComments,
);

router.patch(
    "/:commentId",
    validate({
        params: commentItemParamsSchema,
        body: updateCommentSchema,
    }),
    updateComment,
);

router.delete(
    "/:commentId",
    validate({
        params: commentItemParamsSchema,
    }),
    deleteComment,
);

export default router;
