
import type { RequestHandler } from "express";

import { activityService } from "../services/activity.service.js";

import type { ActivityQuery } from "../schemas/activity.schema.js";

export const getProjectActivities: RequestHandler = async (
    req,
    res,
) => {
    const query = res.locals.validated?.query as ActivityQuery;

    const result = await activityService.findMany(
        req.params.projectId as string,
        req.user!.id,
        query,
    );

    res.status(200).json({
        success: true,
        data: result.activities,
        pagination: result.pagination,
    });
};

export const getTaskActivities: RequestHandler = async (
    req,
    res,
) => {
    const query = res.locals.validated?.query as ActivityQuery;

    const result = await activityService.findTaskActivities(
        req.params.projectId as string,
        req.params.taskId as string,
        req.user!.id,
        query,
    );

    res.status(200).json({
        success: true,
        data: result.activities,
        pagination: result.pagination,
    });
};
