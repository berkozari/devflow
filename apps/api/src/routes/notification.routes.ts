import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js"; import { validate } from "../middlewares/validate.middleware.js";

import { getNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications, } from "../controllers/notification.controller.js";

import { notificationQuerySchema, notificationParamsSchema, } from "../schemas/notification.schema.js";

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: notificationQuerySchema }), getNotifications,);

router.get("/unread-count", getUnreadCount,);

router.patch("/read-all", markAllNotificationsAsRead,);

router.patch("/:notificationId/read", validate({ params: notificationParamsSchema }), markNotificationAsRead,);

router.delete("/", deleteAllNotifications,);

router.delete("/:notificationId", validate({ params: notificationParamsSchema }), deleteNotification,);

export default router;