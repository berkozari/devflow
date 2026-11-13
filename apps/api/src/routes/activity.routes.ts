
import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
    activityParamsSchema,
    taskActivityParamsSchema,
    activityQuerySchema,
} from "../schemas/activity.schema.js";

import {
    getProjectActivities,
    getTaskActivities,
} from "../controllers/activity.controller.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
    "/",
    validate({
        params: activityParamsSchema,
        query: activityQuerySchema,
    }),
    getProjectActivities,
);

router.get(
    "/tasks/:taskId",
    validate({
        params: taskActivityParamsSchema,
        query: activityQuerySchema,
    }),
    getTaskActivities,
);

export default router;
