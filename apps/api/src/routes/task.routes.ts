
import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
} from "../controllers/task.controller.js";

import {
    createTaskSchema,
    updateTaskSchema,
    taskParamsSchema,
    taskProjectParamsSchema,
    taskQuerySchema,
} from "../schemas/task.schema.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
    "/",
    validate({
        body: createTaskSchema,
        params: taskProjectParamsSchema,
    }),
    createTask,
);

router.get(
    "/",
    validate({
        params: taskProjectParamsSchema,
        query: taskQuerySchema,
    }),
    getTasks,
);

router.get(
    "/:taskId",
    validate({
        params: taskParamsSchema,
    }),
    getTaskById,
);

router.patch(
    "/:taskId",
    validate({
        params: taskParamsSchema,
        body: updateTaskSchema,
    }),
    updateTask,
);

router.delete(
    "/:taskId",
    validate({
        params: taskParamsSchema,
    }),
    deleteTask,
);

export default router;
