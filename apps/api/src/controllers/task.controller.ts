
import type { RequestHandler } from "express";

import { taskService } from "../services/task.service.js";
import { taskQuerySchema } from "../schemas/task.schema.js";

export const createTask: RequestHandler = async (req, res) => {
    const task = await taskService.create(
        req.params.projectId as string,
        req.user!.id,
        req.body,
    );

    res.status(201).json({
        success: true,
        message: "Task created successfully",
        data: task,
    });
};

export const getTasks: RequestHandler = async (req, res, next) => {
    try {
        const query = taskQuerySchema.parse(req.query);

        const result = await taskService.findMany(
            req.params.projectId as string,
            req.user!.id,
            query,
        );

        res.status(200).json({
            success: true,
            data: result.tasks,
            pagination: result.pagination,
        });
    } catch (error) {
        console.error("GET TASKS ERROR:", error);
        next(error);
    }
};

export const getTaskById: RequestHandler = async (req, res) => {
    const task = await taskService.findById(
        req.params.projectId as string,
        req.params.taskId as string,
        req.user!.id,
    );

    res.status(200).json({
        success: true,
        data: task,
    });
};

export const updateTask: RequestHandler = async (req, res) => {
    const task = await taskService.update(
        req.params.projectId as string,
        req.params.taskId as string,
        req.user!.id,
        req.body,
    );

    res.status(200).json({
        success: true,
        message: "Task updated successfully",
        data: task,
    });
};

export const deleteTask: RequestHandler = async (req, res) => {
    await taskService.delete(
        req.params.projectId as string,
        req.params.taskId as string,
        req.user!.id,
    );

    res.status(200).json({
        success: true,
        message: "Task deleted successfully",
    });
};
