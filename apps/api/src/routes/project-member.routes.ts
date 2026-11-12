
import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";

import {
    getProjectMembers,
    addProjectMember,
    updateProjectMember,
    removeProjectMember,
} from "../controllers/project-member.controller.js";

const router = Router();

router.use(authenticate);

router.get(
    "/:projectId/members",
    getProjectMembers,
);

router.post(
    "/:projectId/members",
    addProjectMember,
);

router.patch(
    "/:projectId/members/:userId",
    updateProjectMember,
);

router.delete(
    "/:projectId/members/:userId",
    removeProjectMember,
);

export default router;
