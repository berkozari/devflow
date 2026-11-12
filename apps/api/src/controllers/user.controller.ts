import type { RequestHandler } from "express";

export const getMe: RequestHandler = (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user,
    });
};