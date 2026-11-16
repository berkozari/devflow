import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const {
    getOverview,
    getOverdueTasks,
    getUserWorkload,
    getRecentActivities,
} = vi.hoisted(() => ({
    getOverview: vi.fn(),
    getOverdueTasks: vi.fn(),
    getUserWorkload: vi.fn(),
    getRecentActivities: vi.fn(),
}));

vi.mock("../../../src/services/dashboard.service.js", () => ({
    dashboardService: {
        getOverview,
        getOverdueTasks,
        getUserWorkload,
        getRecentActivities,
    },
}));

import {
    getOverview as overviewHandler,
    getOverdueTasks as overdueHandler,
    getUserWorkload as workloadHandler,
    getRecentActivities as activitiesHandler,
} from "../../../src/controllers/dashboard.controller.js";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000002";
const query = {
    projectId: PROJECT_ID,
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-02-01T00:00:00Z",
};

function createMocks() {
    const req = {
        user: { id: USER_ID, role: "USER", email: "dashboard@test.com" },
    } as unknown as Request;
    const res = {
        locals: { validated: { query } },
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn();
    return { req, res, next };
}

describe("Dashboard Controller", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        getOverview.mockResolvedValue({ statistics: { totalProjects: 1 } });
        getOverdueTasks.mockResolvedValue([{ id: "overdue-task" }]);
        getUserWorkload.mockResolvedValue([{ totalTasks: 2 }]);
        getRecentActivities.mockResolvedValue([{ id: "activity" }]);
    });

    it.each([
        ["overview", overviewHandler, getOverview, { statistics: { totalProjects: 1 } }],
        ["overdue tasks", overdueHandler, getOverdueTasks, [{ id: "overdue-task" }]],
        ["workload", workloadHandler, getUserWorkload, [{ totalTasks: 2 }]],
        ["recent activities", activitiesHandler, getRecentActivities, [{ id: "activity" }]],
    ])("returns the %s result for the authenticated user", async (_name, handler, service, data) => {
        const { req, res, next } = createMocks();
        await handler(req, res, next);

        expect(service).toHaveBeenCalledExactlyOnceWith(USER_ID, query);
        expect(res.status).toHaveBeenCalledExactlyOnceWith(200);
        expect(res.json).toHaveBeenCalledExactlyOnceWith({ success: true, data });
        expect(next).not.toHaveBeenCalled();
    });

    it("preserves empty results in the workload response", async () => {
        getUserWorkload.mockResolvedValue([]);
        const { req, res, next } = createMocks();
        await workloadHandler(req, res, next);

        expect(res.json).toHaveBeenCalledExactlyOnceWith({ success: true, data: [] });
    });

    it("forwards the validated empty query unchanged", async () => {
        const { req, res, next } = createMocks();
        res.locals.validated = { query: {} };
        await activitiesHandler(req, res, next);
        expect(getRecentActivities).toHaveBeenCalledExactlyOnceWith(USER_ID, {});
    });
});
