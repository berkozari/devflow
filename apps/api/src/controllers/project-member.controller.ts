
import type { RequestHandler } from "express";
import { projectMemberService } from "../services/project-member.service.js";

import {
    addProjectMemberSchema,
    updateProjectMemberSchema,
    projectMemberParamsSchema,
    projectIdParamsSchema,
} from "../schemas/project-member.schema.js";

export const getProjectMembers: RequestHandler = async (
    req,
    res,
    next,
) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const { projectId } = projectIdParamsSchema.parse(req.params);

        const members = await projectMemberService.findMembers(
            projectId,
            req.user.id,
        );

        res.status(200).json({
            success: true,
            data: members,
        });
    } catch (error) {
        next(error);
    }
};

export const addProjectMember: RequestHandler = async (
    req,
    res,
    next,
) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const { projectId } = projectIdParamsSchema.parse(req.params);
        const data = addProjectMemberSchema.parse(req.body);

        const member = await projectMemberService.addMember(
            projectId,
            req.user.id,
            data,
        );

        res.status(201).json({
            success: true,
            message: "Project member added successfully",
            data: member,
        });
    } catch (error) {
        next(error);
    }
};

export const updateProjectMember: RequestHandler = async (
    req,
    res,
    next,
) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const { projectId, userId } =
            projectMemberParamsSchema.parse(req.params);

        const data = updateProjectMemberSchema.parse(req.body);

        const member = await projectMemberService.updateMemberRole(
            projectId,
            req.user.id,
            userId,
            data,
        );

        res.status(200).json({
            success: true,
            message: "Project member role updated successfully",
            data: member,
        });
    } catch (error) {
        next(error);
    }
};

export const removeProjectMember: RequestHandler = async (
    req,
    res,
    next,
) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const { projectId, userId } =
            projectMemberParamsSchema.parse(req.params);

        await projectMemberService.removeMember(
            projectId,
            req.user.id,
            userId,
        );

        res.status(200).json({
            success: true,
            message: "Project member removed successfully",
        });
    } catch (error) {
        next(error);
    }
};
