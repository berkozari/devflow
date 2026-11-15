
import { Router } from "express";

import {
    getCsrfToken,
    register,
    login,
    refresh,
    logout,
} from "../controllers/auth.controller.js";

import { validate } from "../middlewares/validate.middleware.js";

import {
    authRateLimiter,
    refreshRateLimiter,
} from "../middlewares/rate-limit.middleware.js";

import {
    registerSchema,
    loginSchema,
} from "../schemas/auth.schema.js";

const router = Router();

router.get("/csrf-token", getCsrfToken);

router.post(
    "/register",
    authRateLimiter,
    validate(registerSchema),
    register,
);

router.post(
    "/login",
    authRateLimiter,
    validate(loginSchema),
    login,
);

router.post("/refresh", refreshRateLimiter, refresh);

router.post("/logout", logout);

export default router;
