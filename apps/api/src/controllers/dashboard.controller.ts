
import type { RequestHandler } from "express";

import { dashboardService } from "../services/dashboard.service.js";
import { dashboardQuerySchema, DashboardQueryInput } from "../schemas/dashboard.schema.js";

export const getOverview: RequestHandler = async (req, res) => {
    const query = res.locals.validated?.query as DashboardQueryInput;

    const result = await dashboardService.getOverview(
        req.user!.id,
        query,
    );

    res.status(200).json({
        success: true,
        data: result,
    });
};

export const getOverdueTasks: RequestHandler = async (
    req,
    res,
) => {
    const query = dashboardQuerySchema.parse(req.query);

    const result = await dashboardService.getOverdueTasks(
        req.user!.id,
        query,
    );

    res.status(200).json({
        success: true,
        data: result,
    });
};

export const getUserWorkload: RequestHandler = async (
    req,
    res,
) => {
    const query = dashboardQuerySchema.parse(req.query);

    const result = await dashboardService.getUserWorkload(
        req.user!.id,
        query,
    );

    res.status(200).json({
        success: true,
        data: result,
    });
};

export const getRecentActivities: RequestHandler = async (
    req,
    res,
) => {
    const query = dashboardQuerySchema.parse(req.query);

    const result = await dashboardService.getRecentActivities(
        req.user!.id,
        query,
    );

    res.status(200).json({
        success: true,
        data: result,
    });
};
