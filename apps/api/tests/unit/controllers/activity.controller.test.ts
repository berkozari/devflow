import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const { findMany, findTaskActivities } = vi.hoisted(() => ({
    findMany: vi.fn(),
    findTaskActivities: vi.fn(),
}));

vi.mock("../../../src/services/activity.service.js", () => ({
    activityService: { findMany, findTaskActivities },
}));

import {
    getProjectActivities,
    getTaskActivities,
} from "../../../src/controllers/activity.controller.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000002";
const USER_ID = "00000000-0000-4000-8000-000000000003";
const query = { page: 2, limit: 5 };
const result = {
    activities: [{ id: "activity-1", action: "TASK_CREATED" }],
    pagination: { page: 2, limit: 5, total: 7, totalPages: 2 },
};

function createMocks() {
    const req = {
        params: { projectId: PROJECT_ID, taskId: TASK_ID },
        user: { id: USER_ID, email: "test@example.com", role: "USER" },
    } as unknown as Request;
    const res = {
        locals: { validated: { query } },
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn();
    return { req, res, next };
}

describe("Activity Controller", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        findMany.mockResolvedValue(result);
        findTaskActivities.mockResolvedValue(result);
    });

    it("returns a paginated project history for the authenticated user", async () => {
        const { req, res, next } = createMocks();
        await getProjectActivities(req, res, next);

        expect(findMany).toHaveBeenCalledExactlyOnceWith(PROJECT_ID, USER_ID, query);
        expect(findTaskActivities).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: result.activities,
            pagination: result.pagination,
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns task-specific activities with the validated query", async () => {
        const { req, res, next } = createMocks();
        await getTaskActivities(req, res, next);

        expect(findTaskActivities).toHaveBeenCalledExactlyOnceWith(
            PROJECT_ID, TASK_ID, USER_ID, query,
        );
        expect(findMany).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: result.activities,
            pagination: result.pagination,
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("preserves an empty response and zero-page pagination", async () => {
        findMany.mockResolvedValue({
            activities: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        });
        const { req, res, next } = createMocks();
        await getProjectActivities(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        });
    });
});
