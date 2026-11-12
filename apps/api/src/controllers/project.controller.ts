
import type { RequestHandler } from "express";
import { projectService } from "../services/project.service.js";
import {
    createProjectSchema,
    updateProjectSchema,
    projectParamsSchema,
    projectQuerySchema,
} from "../schemas/project.schema.js";

import { AppError } from "../utils/app-error.js";

function handleError(
    error: unknown,
    next: (error?: unknown) => void,
) {
    if (
        error instanceof Error &&
        error.message === "PROJECT_NOT_FOUND"
    ) {
        next(new AppError("Project not found", 404));
        return;
    }

    next(error);
}

export const createProject: RequestHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const data = createProjectSchema.parse(req.body);

        const project = await projectService.create(
            req.user.id,
            data,
        );

        res.status(201).json({
            success: true,
            message: "Project created successfully",
            data: project,
        });
    } catch (error) {
        handleError(error, next);
    }
};

export const getProjects: RequestHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const query = projectQuerySchema.parse(req.query);

        const result = await projectService.findMany(
            req.user.id,
            query,
        );

        res.status(200).json({
            success: true,
            data: result.projects,
            pagination: result.pagination,
        });
    } catch (error) {
        handleError(error, next);
    }
};

export const getProjectById: RequestHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const { id } = projectParamsSchema.parse(req.params);

        const project = await projectService.findById(
            id,
            req.user.id,
        );

        res.status(200).json({
            success: true,
            data: project,
        });
    } catch (error) {
        handleError(error, next);
    }
};

export const updateProject: RequestHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const { id } = projectParamsSchema.parse(req.params);
        const data = updateProjectSchema.parse(req.body);

        const project = await projectService.update(
            id,
            req.user.id,
            data,
        );

        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            data: project,
        });
    } catch (error) {
        handleError(error, next);
    }
};

export const deleteProject: RequestHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const { id } = projectParamsSchema.parse(req.params);

        await projectService.delete(id, req.user.id);

        res.status(200).json({
            success: true,
            message: "Project deleted successfully",
        });
    } catch (error) {
        handleError(error, next);
    }
};
