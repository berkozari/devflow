
import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
    getOverview,
    getOverdueTasks,
    getUserWorkload,
    getRecentActivities,
} from "../controllers/dashboard.controller.js";

import {
    dashboardQuerySchema,
} from "../schemas/dashboard.schema.js";

const router = Router();

router.use(authenticate);

router.get(
    "/overview",
    validate({
        query: dashboardQuerySchema,
    }),
    getOverview,
);

router.get(
    "/overdue-tasks",
    validate({
        query: dashboardQuerySchema,
    }),
    getOverdueTasks,
);

router.get(
    "/workload",
    validate({
        query: dashboardQuerySchema,
    }),
    getUserWorkload,
);

router.get(
    "/activities",
    validate({
        query: dashboardQuerySchema,
    }),
    getRecentActivities,
);

export default router;
