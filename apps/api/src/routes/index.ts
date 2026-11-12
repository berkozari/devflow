import { Router } from "express";
import authRouter from "./auth.routes.js";
import userRouter from "./user.routes.js";
import adminRouter from "./admin.routes.js";
import projectRouter from "./project.routes.js";
import projectMemberRouter from "./project-member.routes.js";

const router = Router();

router.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "DevFlow API v1",
    });
});

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/admin", adminRouter);
router.use("/projects", projectRouter);
router.use("/projects", projectMemberRouter);

export default router;