import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

const router = Router();

router.get(
    "/dashboard",
    authenticate,
    authorize("ADMIN"),
    (_req, res) => {
        res.status(200).json({
            success: true,
            message: "Welcome to the admin dashboard",
        });
    },
);

export default router;