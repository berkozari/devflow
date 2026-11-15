
import { Router } from "express";

import {
    generateCsrfToken,
} from "../config/csrf.js";

const router = Router();

router.get("/csrf-token", (req, res) => {
    const csrfToken = generateCsrfToken(req, res);

    res.status(200).json({
        success: true,
        csrfToken,
    });
});

export default router;
