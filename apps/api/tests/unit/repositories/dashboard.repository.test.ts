import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    projectFindMany,
    projectGroupBy,
    taskGroupBy,
    taskCount,
    taskFindMany,
    userFindMany,
    activityFindMany,
} = vi.hoisted(() => ({
    projectFindMany: vi.fn(),
    projectGroupBy: vi.fn(),
    taskGroupBy: vi.fn(),
    taskCount: vi.fn(),
    taskFindMany: vi.fn(),
    userFindMany: vi.fn(),
    activityFindMany: vi.fn(),
}));

vi.mock("../../../src/config/database.js", () => ({
    prisma: {
        project: { findMany: projectFindMany, groupBy: projectGroupBy },
        task: { groupBy: taskGroupBy, count: taskCount, findMany: taskFindMany },
        user: { findMany: userFindMany },
        activityLog: { findMany: activityFindMany },
    },
}));

import { dashboardRepository } from "../../../src/repositories/dashboard.repository.js";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_A = "00000000-0000-4000-8000-000000000002";
const PROJECT_B = "00000000-0000-4000-8000-000000000003";
const PROJECT_IDS = [PROJECT_A, PROJECT_B];
const NOW = new Date("2026-06-15T12:00:00Z");
const START = "2026-06-01T00:00:00Z";
const END = "2026-06-30T23:59:59Z";
const RANGE = { startDate: START, endDate: END };
const CREATED_AT = { createdAt: { gte: new Date(START), lte: new Date(END) } };

describe("Dashboard Repository", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        projectFindMany.mockResolvedValue([]);
        projectGroupBy.mockResolvedValue([]);
        taskGroupBy.mockResolvedValue([]);
        taskCount.mockResolvedValue(0);
        taskFindMany.mockResolvedValue([]);
        userFindMany.mockResolvedValue([]);
        activityFindMany.mockResolvedValue([]);
    });

    it("finds only projects owned by or shared with the authenticated user", async () => {
        projectFindMany.mockResolvedValue([{ id: PROJECT_A }]);
        expect(await dashboardRepository.findUserProjects(USER_ID)).toEqual([{ id: PROJECT_A }]);
        expect(projectFindMany).toHaveBeenCalledExactlyOnceWith({
            where: {
                OR: [
                    { ownerId: USER_ID },
                    { members: { some: { userId: USER_ID } } },
                ],
            },
            select: { id: true },
        });
    });

    it("combines projectId filtering with the user's ownership or membership", async () => {
        await dashboardRepository.findUserProjects(USER_ID, PROJECT_B);
        expect(projectFindMany).toHaveBeenCalledExactlyOnceWith({
            where: {
                id: PROJECT_B,
                OR: [
                    { ownerId: USER_ID },
                    { members: { some: { userId: USER_ID } } },
                ],
            },
            select: { id: true },
        });
    });

    it("returns grouped status counts, overdue and unassigned totals without N+1 queries", async () => {
        projectGroupBy.mockResolvedValue([
            { status: "ACTIVE", _count: { _all: 3 } },
            { status: "COMPLETED", _count: { _all: 2 } },
            { status: "ARCHIVED", _count: { _all: 1 } },
        ]);
        taskGroupBy.mockResolvedValue([
            { status: "DONE", _count: { _all: 1 } },
            { status: "TODO", _count: { _all: 4 } },
        ]);
        taskCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

        const data = await dashboardRepository.getOverview(PROJECT_IDS, RANGE, NOW);
        expect(data).toEqual({
            totalProjects: 6, activeProjects: 3, completedProjects: 2,
            totalTasks: 5, completedTasks: 1, overdueTasks: 2, unassignedTasks: 3,
        });
        expect(projectGroupBy).toHaveBeenCalledExactlyOnceWith({
            by: ["status"],
            where: { id: { in: PROJECT_IDS }, ...CREATED_AT },
            _count: { _all: true },
        });
        expect(taskGroupBy).toHaveBeenCalledExactlyOnceWith({
            by: ["status"],
            where: { projectId: { in: PROJECT_IDS }, ...CREATED_AT },
            _count: { _all: true },
        });
        expect(taskCount).toHaveBeenNthCalledWith(1, {
            where: {
                projectId: { in: PROJECT_IDS }, status: { not: "DONE" },
                dueDate: { lt: NOW, gte: new Date(START), lte: new Date(END) },
            },
        });
        expect(taskCount).toHaveBeenNthCalledWith(2, {
            where: {
                projectId: { in: PROJECT_IDS },
                assigneeId: null, status: { not: "DONE" }, ...CREATED_AT,
            },
        });
    });

    it("provides zero counts for missing grouped statuses", async () => {
        projectGroupBy.mockResolvedValue([{ status: "PLANNING", _count: { _all: 2 } }]);
        taskGroupBy.mockResolvedValue([{ status: "IN_PROGRESS", _count: { _all: 1 } }]);
        const data = await dashboardRepository.getOverview(PROJECT_IDS, {}, NOW);
        expect(data).toMatchObject({
            totalProjects: 2, activeProjects: 0, completedProjects: 0,
            totalTasks: 1, completedTasks: 0,
        });
        expect(projectGroupBy.mock.calls[0][0].where).not.toHaveProperty("createdAt");
        expect(taskCount.mock.calls[0][0].where.dueDate).toEqual({ lt: NOW });
    });

    it("accepts a start-only date range on grouped queries", async () => {
        await dashboardRepository.getTasksByStatus(PROJECT_IDS, { startDate: START });
        expect(taskGroupBy).toHaveBeenCalledWith({
            by: ["status"],
            where: { projectId: { in: PROJECT_IDS }, createdAt: { gte: new Date(START) } },
            _count: { _all: true },
        });
    });

    it("accepts an end-only date range and groups by priority", async () => {
        await dashboardRepository.getTasksByPriority(PROJECT_IDS, { endDate: END });
        expect(taskGroupBy).toHaveBeenCalledExactlyOnceWith({
            by: ["priority"],
            where: { projectId: { in: PROJECT_IDS }, createdAt: { lte: new Date(END) } },
            _count: { _all: true },
        });
    });

    it("groups statuses without applying a date filter when absent", async () => {
        await dashboardRepository.getTasksByStatus(PROJECT_IDS, {});
        expect(taskGroupBy.mock.calls[0][0].where).toEqual({ projectId: { in: PROJECT_IDS } });
    });

    it("returns overdue tasks with deterministic sorting and a bounded result", async () => {
        taskFindMany.mockResolvedValue([{ id: "task-1" }]);
        expect(await dashboardRepository.getOverdueTasks(PROJECT_IDS, RANGE, 7, NOW))
            .toEqual([{ id: "task-1" }]);
        expect(taskFindMany).toHaveBeenCalledExactlyOnceWith({
            where: {
                projectId: { in: PROJECT_IDS }, status: { not: "DONE" },
                dueDate: { lt: NOW, gte: new Date(START), lte: new Date(END) },
            },
            orderBy: [{ dueDate: "asc" }, { id: "asc" }],
            take: 7,
            select: {
                id: true, title: true, status: true, priority: true, dueDate: true,
                assignee: { select: { id: true, name: true, email: true } },
                project: { select: { id: true, name: true } },
            },
        });
    });

    it("uses the default limit when none is supplied", async () => {
        await dashboardRepository.getOverdueTasks(PROJECT_IDS, {}, undefined, NOW);
        expect(taskFindMany.mock.calls[0][0].take).toBe(10);
        expect(taskFindMany.mock.calls[0][0].where.dueDate).toEqual({ lt: NOW });
    });

    it("returns empty workload without querying user profiles", async () => {
        expect(await dashboardRepository.getUserWorkload(PROJECT_IDS, {})).toEqual([]);
        expect(userFindMany).not.toHaveBeenCalled();
        expect(taskGroupBy).toHaveBeenCalledExactlyOnceWith({
            by: ["assigneeId"],
            where: {
                projectId: { in: PROJECT_IDS },
                assigneeId: { not: null }, status: { not: "DONE" },
            },
            _count: { _all: true },
            orderBy: { _count: { assigneeId: "desc" } },
        });
    });

    it("joins workload to known assignees, omitting null and deleted users", async () => {
        taskGroupBy.mockResolvedValue([
            { assigneeId: USER_ID, _count: { _all: 4 } },
            { assigneeId: null, _count: { _all: 8 } },
            { assigneeId: "absent-user", _count: { _all: 2 } },
        ]);
        const user = { id: USER_ID, name: "Ada", email: "ada@test.com" };
        userFindMany.mockResolvedValue([user]);
        expect(await dashboardRepository.getUserWorkload(PROJECT_IDS, RANGE)).toEqual([
            { user, totalTasks: 4 },
        ]);
        expect(userFindMany).toHaveBeenCalledExactlyOnceWith({
            where: { id: { in: [USER_ID, "absent-user"] } },
            select: { id: true, name: true, email: true },
        });
        expect(taskGroupBy.mock.calls[0][0].where).toMatchObject(CREATED_AT);
    });

    it("fetches recent activities with stable order and date scope", async () => {
        await dashboardRepository.getRecentActivities(PROJECT_IDS, RANGE, 6);
        expect(activityFindMany).toHaveBeenCalledExactlyOnceWith({
            where: { projectId: { in: PROJECT_IDS }, ...CREATED_AT },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 6,
            select: {
                id: true, action: true, metadata: true, createdAt: true,
                actor: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
                task: { select: { id: true, title: true } },
            },
        });
    });

    it("defaults recent activities to ten entries", async () => {
        await dashboardRepository.getRecentActivities(PROJECT_IDS, {});
        expect(activityFindMany.mock.calls[0][0].take).toBe(10);
        expect(activityFindMany.mock.calls[0][0].where).toEqual({ projectId: { in: PROJECT_IDS } });
    });

    it("calculates per-project completion rates from grouped task statuses", async () => {
        const projects = [
            { id: PROJECT_A, name: "One", status: "ACTIVE" },
            { id: PROJECT_B, name: "Two", status: "PLANNING" },
            { id: "project-no-tasks", name: "Empty", status: "PLANNING" },
        ];
        projectFindMany.mockResolvedValue(projects);
        taskGroupBy.mockResolvedValue([
            { projectId: PROJECT_A, status: "DONE", _count: { _all: 1 } },
            { projectId: PROJECT_A, status: "TODO", _count: { _all: 2 } },
            { projectId: PROJECT_B, status: "IN_PROGRESS", _count: { _all: 2 } },
        ]);
        expect(await dashboardRepository.getProjectProgress(PROJECT_IDS, RANGE)).toEqual([
            { ...projects[0], totalTasks: 3, completedTasks: 1, completionRate: 33.33 },
            { ...projects[1], totalTasks: 2, completedTasks: 0, completionRate: 0 },
            { ...projects[2], totalTasks: 0, completedTasks: 0, completionRate: 0 },
        ]);
        expect(projectFindMany).toHaveBeenCalledExactlyOnceWith({
            where: { id: { in: PROJECT_IDS }, ...CREATED_AT },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: { id: true, name: true, status: true },
        });
        expect(taskGroupBy).toHaveBeenCalledExactlyOnceWith({
            by: ["projectId", "status"],
            where: { projectId: { in: PROJECT_IDS }, ...CREATED_AT },
            _count: { _all: true },
        });
    });

    it("propagates repository failures instead of manufacturing empty totals", async () => {
        taskCount.mockRejectedValue(new Error("database read failed"));
        await expect(dashboardRepository.getOverview(PROJECT_IDS, {}, NOW))
            .rejects.toThrow("database read failed");
    });
});
