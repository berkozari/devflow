import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    createActivity,
    findActivities,
    findProjectMember,
    findTask,
} = vi.hoisted(() => ({
    createActivity: vi.fn(),
    findActivities: vi.fn(),
    findProjectMember: vi.fn(),
    findTask: vi.fn(),
}));

vi.mock("../../../src/repositories/activity.repository.js", () => ({
    activityRepository: {
        create: createActivity,
        findMany: findActivities,
    },
}));
vi.mock("../../../src/repositories/project-member.repository.js", () => ({
    projectMemberRepository: { findProjectMember },
}));
vi.mock("../../../src/repositories/task.repository.js", () => ({
    taskRepository: { findById: findTask },
}));

import { activityService } from "../../../src/services/activity.service.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000002";
const USER_ID = "00000000-0000-4000-8000-000000000003";
const OTHER_USER = "00000000-0000-4000-8000-000000000004";
const activities = [
    { id: "activity-1", action: "TASK_CREATED" },
    { id: "activity-2", action: "TASK_UPDATED" },
];

const query = { page: 2, limit: 5 };

describe("Activity Service", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        findProjectMember.mockResolvedValue({
            projectId: PROJECT_ID,
            userId: USER_ID,
            role: "MEMBER",
        });
        findTask.mockResolvedValue({ id: TASK_ID, projectId: PROJECT_ID });
        findActivities.mockResolvedValue([activities, 12]);
        createActivity.mockResolvedValue({ id: "activity-created" });
    });

    describe("create", () => {
        it("delegates to repository inside the caller-provided transaction", async () => {
            const tx = { tag: "transaction" };
            const data = {
                action: "TASK_CREATED" as const,
                projectId: PROJECT_ID,
                actorId: USER_ID,
                taskId: TASK_ID,
                metadata: { source: "test" },
            };

            const result = await activityService.create(tx as never, data);

            expect(result).toEqual({ id: "activity-created" });
            expect(createActivity).toHaveBeenCalledExactlyOnceWith(tx, data);
            expect(findActivities).not.toHaveBeenCalled();
        });

        it("propagates repository write failures to the transaction caller", async () => {
            createActivity.mockRejectedValue(new Error("insert failed"));

            await expect(activityService.create({} as never, {
                action: "TASK_UPDATED",
                projectId: PROJECT_ID,
                actorId: USER_ID,
            })).rejects.toThrow("insert failed");
        });
    });

    describe("findMany", () => {
        it("checks membership before reading activities", async () => {
            const result = await activityService.findMany(PROJECT_ID, USER_ID, query);

            expect(findProjectMember).toHaveBeenCalledExactlyOnceWith(
                PROJECT_ID,
                USER_ID,
            );
            expect(findActivities).toHaveBeenCalledExactlyOnceWith(PROJECT_ID, query);
            expect(result).toEqual({
                activities,
                pagination: { page: 2, limit: 5, total: 12, totalPages: 3 },
            });
        });

        it("accepts a valid member irrespective of the role", async () => {
            findProjectMember.mockResolvedValue({ role: "OWNER", userId: USER_ID });

            await activityService.findMany(PROJECT_ID, USER_ID, query);

            expect(findActivities).toHaveBeenCalledOnce();
        });

        it("returns 404 for non-members without querying the activity repository", async () => {
            findProjectMember.mockResolvedValue(null);

            await expect(
                activityService.findMany(PROJECT_ID, OTHER_USER, query),
            ).rejects.toMatchObject({ statusCode: 404, message: "Project not found" });
            expect(findActivities).not.toHaveBeenCalled();
        });

        it("returns zero pages for an empty activity history", async () => {
            findActivities.mockResolvedValue([[], 0]);

            expect(await activityService.findMany(PROJECT_ID, USER_ID, {
                page: 1,
                limit: 10,
            })).toEqual({
                activities: [],
                pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
            });
        });

        it("rounds up the total page count", async () => {
            findActivities.mockResolvedValue([activities, 11]);

            const result = await activityService.findMany(PROJECT_ID, USER_ID, query);

            expect(result.pagination.totalPages).toBe(3);
        });

        it("propagates unexpected membership lookup errors", async () => {
            findProjectMember.mockRejectedValue(new Error("connection lost"));

            await expect(activityService.findMany(PROJECT_ID, USER_ID, query))
                .rejects.toThrow("connection lost");
            expect(findActivities).not.toHaveBeenCalled();
        });

        it("propagates activity repository errors", async () => {
            findActivities.mockRejectedValue(new Error("read failed"));

            await expect(activityService.findMany(PROJECT_ID, USER_ID, query))
                .rejects.toThrow("read failed");
        });
    });

    describe("findTaskActivities", () => {
        it("checks project membership and task existence before querying", async () => {
            const result = await activityService.findTaskActivities(
                PROJECT_ID,
                TASK_ID,
                USER_ID,
                query,
            );

            expect(findProjectMember).toHaveBeenCalledExactlyOnceWith(
                PROJECT_ID,
                USER_ID,
            );
            expect(findTask).toHaveBeenCalledExactlyOnceWith(PROJECT_ID, TASK_ID);
            expect(findActivities).toHaveBeenCalledExactlyOnceWith(
                PROJECT_ID,
                query,
                TASK_ID,
            );
            expect(result).toEqual({
                activities,
                pagination: { page: 2, limit: 5, total: 12, totalPages: 3 },
            });
        });

        it("does not look up a task for a user who is not a project member", async () => {
            findProjectMember.mockResolvedValue(null);

            await expect(activityService.findTaskActivities(
                PROJECT_ID,
                TASK_ID,
                OTHER_USER,
                query,
            )).rejects.toMatchObject({ statusCode: 404, message: "Project not found" });
            expect(findTask).not.toHaveBeenCalled();
            expect(findActivities).not.toHaveBeenCalled();
        });

        it("returns 404 when the task is absent from the selected project", async () => {
            findTask.mockResolvedValue(null);

            await expect(activityService.findTaskActivities(
                PROJECT_ID,
                TASK_ID,
                USER_ID,
                query,
            )).rejects.toMatchObject({ statusCode: 404, message: "Task not found" });
            expect(findActivities).not.toHaveBeenCalled();
        });

        it("returns zero total pages when a task has no history", async () => {
            findActivities.mockResolvedValue([[], 0]);

            expect(await activityService.findTaskActivities(
                PROJECT_ID, TASK_ID, USER_ID, { page: 1, limit: 10 },
            )).toEqual({
                activities: [],
                pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
            });
        });

        it("does not query activity history when the task lookup fails", async () => {
            findTask.mockRejectedValue(new Error("lookup failed"));

            await expect(activityService.findTaskActivities(
                PROJECT_ID,
                TASK_ID,
                USER_ID,
                query,
            )).rejects.toThrow("lookup failed");
            expect(findActivities).not.toHaveBeenCalled();
        });

        it("propagates repository read errors", async () => {
            findActivities.mockRejectedValue(new Error("activity read failed"));

            await expect(activityService.findTaskActivities(
                PROJECT_ID,
                TASK_ID,
                USER_ID,
                query,
            )).rejects.toThrow("activity read failed");
        });
    });
});
