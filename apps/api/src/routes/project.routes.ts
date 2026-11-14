
import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";

import {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getProjectMembers,
    addProjectMember,
    updateProjectMemberRole,
    removeProjectMember,
} from "../controllers/project.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:id", getProjectById);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);
router.get("/:id/members", getProjectMembers);
router.post("/:id/members", addProjectMember);
router.patch("/:id/members/:userId", updateProjectMemberRole);
router.delete("/:id/members/:userId", removeProjectMember);

export default router;
