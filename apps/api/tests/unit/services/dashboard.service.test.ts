import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    findUserProjects,
    getOverview,
    getTasksByStatus,
    getTasksByPriority,
    getProjectProgress,
    getOverdueTasks,
    getUserWorkload,
    getRecentActivities,
    cacheGet,
    cacheSet,
    loggerWarn,
} = vi.hoisted(() => ({
    findUserProjects: vi.fn(),
    getOverview: vi.fn(),
    getTasksByStatus: vi.fn(),
    getTasksByPriority: vi.fn(),
    getProjectProgress: vi.fn(),
    getOverdueTasks: vi.fn(),
    getUserWorkload: vi.fn(),
    getRecentActivities: vi.fn(),
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
    loggerWarn: vi.fn(),
}));

vi.mock("../../../src/repositories/dashboard.repository.js", () => ({
    dashboardRepository: {
        findUserProjects,
        getOverview,
        getTasksByStatus,
        getTasksByPriority,
        getProjectProgress,
        getOverdueTasks,
        getUserWorkload,
        getRecentActivities,
    },
}));
vi.mock("../../../src/lib/cache.js", () => ({
    cache: { get: cacheGet, set: cacheSet },
}));
vi.mock("../../../src/lib/logger.js", () => ({
    logger: { warn: loggerWarn },
}));

import { dashboardService } from "../../../src/services/dashboard.service.js";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER = "00000000-0000-4000-8000-000000000002";
const PROJECT_A = "00000000-0000-4000-8000-000000000003";
const PROJECT_B = "00000000-0000-4000-8000-000000000004";
const query = {};
const statistics = {
    totalProjects: 2,
    activeProjects: 1,
    completedProjects: 1,
    totalTasks: 3,
    completedTasks: 1,
    overdueTasks: 1,
    unassignedTasks: 2,
};

describe("Dashboard Service", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        findUserProjects.mockResolvedValue([{ id: PROJECT_A }, { id: PROJECT_B }]);
        getOverview.mockResolvedValue(statistics);
        getTasksByStatus.mockResolvedValue([{ status: "DONE", _count: { _all: 1 } }]);
        getTasksByPriority.mockResolvedValue([{ priority: "HIGH", _count: { _all: 2 } }]);
        getProjectProgress.mockResolvedValue([{ id: PROJECT_A, completionRate: 50 }]);
        getOverdueTasks.mockResolvedValue([{ id: "task-1" }]);
        getUserWorkload.mockResolvedValue([{ user: { id: USER_ID }, totalTasks: 2 }]);
        getRecentActivities.mockResolvedValue([{ id: "activity-1" }]);
        cacheGet.mockResolvedValue(null);
        cacheSet.mockResolvedValue(undefined);
    });

    it("aggregates overview data and rounds the completion rate", async () => {
        const result = await dashboardService.getOverview(USER_ID, query);

        expect(result).toEqual({
            statistics: { ...statistics, completionRate: 33.33 },
            tasksByStatus: [{ status: "DONE", _count: { _all: 1 } }],
            tasksByPriority: [{ priority: "HIGH", _count: { _all: 2 } }],
            projectProgress: [{ id: PROJECT_A, completionRate: 50 }],
        });
        expect(findUserProjects).toHaveBeenCalledWith(USER_ID, undefined);
        for (const mocked of [getOverview, getTasksByStatus, getTasksByPriority, getProjectProgress]) {
            expect(mocked).toHaveBeenCalledExactlyOnceWith([PROJECT_A, PROJECT_B], query);
        }
        expect(cacheSet).toHaveBeenCalledWith(
            expect.stringMatching(/^dashboard:overview:.*:[a-f0-9]{64}$/),
            result,
            60,
        );
    });

    it("reports zero completion with no tasks", async () => {
        getOverview.mockResolvedValue({ ...statistics, totalTasks: 0, completedTasks: 0 });
        const result = await dashboardService.getOverview(USER_ID, query);
        expect(result.statistics.completionRate).toBe(0);
    });

    it("returns the complete zero overview without querying aggregations when no projects are accessible", async () => {
        findUserProjects.mockResolvedValue([]);
        const result = await dashboardService.getOverview(USER_ID, query);
        expect(result).toEqual({
            statistics: {
                totalProjects: 0,
                activeProjects: 0,
                completedProjects: 0,
                totalTasks: 0,
                completedTasks: 0,
                overdueTasks: 0,
                unassignedTasks: 0,
                completionRate: 0,
            },
            tasksByStatus: [], tasksByPriority: [], projectProgress: [],
        });
        expect(getOverview).not.toHaveBeenCalled();
        expect(getTasksByStatus).not.toHaveBeenCalled();
    });

    it.each([
        ["overdue", "getOverdueTasks", getOverdueTasks, 60],
        ["workload", "getUserWorkload", getUserWorkload, 120],
        ["activities", "getRecentActivities", getRecentActivities, 30],
    ] as const)("loads %s and caches its result using the resource TTL", async (resource, method, repoMock, ttl) => {
        const data = await dashboardService[method](USER_ID, query);
        expect(repoMock).toHaveBeenCalledExactlyOnceWith([PROJECT_A, PROJECT_B], query);
        expect(cacheSet).toHaveBeenCalledExactlyOnceWith(
            expect.stringMatching(new RegExp(`^dashboard:${resource}:${USER_ID}:[a-f0-9]{64}$`)),
            data,
            ttl,
        );
    });

    it.each([
        ["getOverdueTasks", getOverdueTasks],
        ["getUserWorkload", getUserWorkload],
        ["getRecentActivities", getRecentActivities],
    ] as const)("returns an empty array for %s without querying the repository", async (method, repoMock) => {
        findUserProjects.mockResolvedValue([]);
        await expect(dashboardService[method](USER_ID, query)).resolves.toEqual([]);
        expect(repoMock).not.toHaveBeenCalled();
    });

    it.each([
        "getOverview", "getOverdueTasks", "getUserWorkload", "getRecentActivities",
    ] as const)("returns 404 for an inaccessible projectId on %s", async (method) => {
        findUserProjects.mockResolvedValue([]);
        await expect(dashboardService[method](USER_ID, { projectId: PROJECT_A }))
            .rejects.toMatchObject({ statusCode: 404, message: "Project not found" });
        expect(findUserProjects).toHaveBeenCalledExactlyOnceWith(USER_ID, PROJECT_A);
        expect(cacheGet).not.toHaveBeenCalled();
        expect(getOverview).not.toHaveBeenCalled();
        expect(getOverdueTasks).not.toHaveBeenCalled();
    });

    it("returns cached overview data without invoking any aggregations or writing the cache", async () => {
        const cached = { statistics: { totalProjects: 7, completionRate: 88 }, tasksByStatus: [] };
        cacheGet.mockResolvedValue(cached);
        expect(await dashboardService.getOverview(USER_ID, query)).toBe(cached);
        expect(getOverview).not.toHaveBeenCalled();
        expect(getProjectProgress).not.toHaveBeenCalled();
        expect(cacheSet).not.toHaveBeenCalled();
    });

    it("treats an empty array cache hit as valid and does not fall back to the database", async () => {
        cacheGet.mockResolvedValue([]);
        expect(await dashboardService.getOverdueTasks(USER_ID, query)).toEqual([]);
        expect(getOverdueTasks).not.toHaveBeenCalled();
    });

    it("does not let a cache read failure hide database data or trigger a cache write", async () => {
        cacheGet.mockRejectedValue(new TypeError("cache read failed with secret: do-not-log"));
        const result = await dashboardService.getOverdueTasks(USER_ID, query);
        expect(result).toEqual([{ id: "task-1" }]);
        expect(cacheSet).not.toHaveBeenCalled();
        expect(loggerWarn).toHaveBeenCalledExactlyOnceWith(
            { operation: "read", errorType: "TypeError" },
            "Dashboard cache operation failed; using database result",
        );
    });

    it("does not leak an unexpected cache error value into logs", async () => {
        cacheGet.mockRejectedValue("sensitive token content");
        await dashboardService.getUserWorkload(USER_ID, query);
        expect(loggerWarn).toHaveBeenCalledWith(
            { operation: "read", errorType: "UnknownError" },
            expect.any(String),
        );
    });

    it("returns the database result when a cache write fails", async () => {
        cacheSet.mockRejectedValue(new Error("write error with secret"));
        const result = await dashboardService.getRecentActivities(USER_ID, query);
        expect(result).toEqual([{ id: "activity-1" }]);
        expect(loggerWarn).toHaveBeenCalledExactlyOnceWith(
            { operation: "write", errorType: "Error" },
            "Dashboard cache operation failed; using database result",
        );
    });

    it("propagates database failures and does not try to cache failed reads", async () => {
        getOverview.mockRejectedValue(new Error("database unavailable"));
        await expect(dashboardService.getOverview(USER_ID, query))
            .rejects.toThrow("database unavailable");
        expect(cacheSet).not.toHaveBeenCalled();
    });

    it("propagates failure to identify the user's accessible projects", async () => {
        findUserProjects.mockRejectedValue(new Error("permission lookup unavailable"));
        await expect(dashboardService.getRecentActivities(USER_ID, query))
            .rejects.toThrow("permission lookup unavailable");
        expect(cacheGet).not.toHaveBeenCalled();
    });

    it("isolates cache entries by user, query, and resource", async () => {
        await dashboardService.getOverdueTasks(USER_ID, query);
        await dashboardService.getOverdueTasks(OTHER_USER, query);
        await dashboardService.getOverdueTasks(USER_ID, { startDate: "2026-01-01T00:00:00Z" });
        await dashboardService.getUserWorkload(USER_ID, query);

        const keys = cacheGet.mock.calls.map(([key]) => key);
        expect(new Set(keys).size).toBe(4);
        expect(keys[0]).toContain(`dashboard:overdue:${USER_ID}:`);
        expect(keys[1]).toContain(`dashboard:overdue:${OTHER_USER}:`);
        expect(keys[3]).toContain(`dashboard:workload:${USER_ID}:`);
    });

    it("uses the same cache key regardless of the order of accessible project IDs", async () => {
        await dashboardService.getOverdueTasks(USER_ID, query);
        const first = cacheGet.mock.calls[0][0];
        findUserProjects.mockResolvedValue([{ id: PROJECT_B }, { id: PROJECT_A }]);
        await dashboardService.getOverdueTasks(USER_ID, query);
        expect(cacheGet.mock.calls[1][0]).toBe(first);
    });

    it("uses only the accessible IDs for a project-filtered request", async () => {
        findUserProjects.mockResolvedValue([{ id: PROJECT_B }]);
        const filteredQuery = { projectId: PROJECT_B };
        await dashboardService.getRecentActivities(USER_ID, filteredQuery);
        expect(findUserProjects).toHaveBeenCalledExactlyOnceWith(USER_ID, PROJECT_B);
        expect(getRecentActivities).toHaveBeenCalledExactlyOnceWith([PROJECT_B], filteredQuery);
    });
});
