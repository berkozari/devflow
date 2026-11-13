import type { RequestHandler } from "express";

import { notificationService } from "../services/notification.service.js";

import type { NotificationQuery, NotificationParams, } from "../schemas/notification.schema.js";

export const getNotifications: RequestHandler = async (req, res) => {
    const query = res.locals.validated!.query as NotificationQuery;

    const result = await notificationService.findMany(
        req.user!.id,
        query,
    );

    res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
    });
};

export const getUnreadCount: RequestHandler = async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user!.id,);

    res.status(200).json({
        success: true,
        data: { count },
    });
};

export const markNotificationAsRead: RequestHandler = async (req, res,) => {
    const params = res.locals.validated!.params as NotificationParams;

    await notificationService.markAsRead(
        req.user!.id,
        params.notificationId,
    );

    res.status(200).json({
        success: true,
        message: "Notification marked as read",
    });
};

export const markAllNotificationsAsRead: RequestHandler = async (req, res,) => {
    const result = await notificationService.markAllAsRead(req.user!.id,);

    res.status(200).json({
        success: true,
        message: "All notifications marked as read",
        data: result,
    });
};

export const deleteNotification: RequestHandler = async (req, res,) => {
    const params = res.locals.validated!.params as NotificationParams;

    await notificationService.delete(
        req.user!.id,
        params.notificationId,
    );

    res.status(200).json({
        success: true,
        message: "Notification deleted successfully",
    });
};

export const deleteAllNotifications: RequestHandler = async (req, res,) => {
    const result = await notificationService.deleteAll(req.user!.id,);

    res.status(200).json({
        success: true,
        message: "All notifications deleted successfully",
        data: result,
    });
};