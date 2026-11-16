import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    findMany,
    count,
    transaction,
} = vi.hoisted(() => ({
    findMany: vi.fn(),
    count: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock("../../../src/config/database.js", () => ({
    prisma: {
        activityLog: { findMany, count },
        $transaction: transaction,
    },
}));

import { activityRepository } from "../../../src/repositories/activity.repository.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000002";
const ACTOR_ID = "00000000-0000-4000-8000-000000000003";
const query = { page: 3, limit: 5 };

// The production repository uses Prisma's array-transaction form.
// Resolve mocked read operations in the same order as the array.
describe("Activity Repository", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        findMany.mockResolvedValue([{ id: "activity-1" }]);
        count.mockResolvedValue(11);
        transaction.mockImplementation((operations: Promise<unknown>[]) =>
            Promise.all(operations),
        );
    });

    it("creates an activity using the provided transaction client", async () => {
        const create = vi.fn().mockResolvedValue({ id: "created-activity" });
        const tx = { activityLog: { create } };
        const data = {
            action: "TASK_CREATED" as const,
            projectId: PROJECT_ID,
            actorId: ACTOR_ID,
            taskId: TASK_ID,
            metadata: { before: null, after: "TODO" },
        };

        const result = await activityRepository.create(tx as never, data);

        expect(result).toEqual({ id: "created-activity" });
        expect(create).toHaveBeenCalledExactlyOnceWith({ data });
        expect(findMany).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
    });

    it("forwards an activity without optional task and metadata", async () => {
        const create = vi.fn().mockResolvedValue({ id: "created-activity" });
        const tx = { activityLog: { create } };
        const data = {
            action: "COMMENT_CREATED" as const,
            projectId: PROJECT_ID,
            actorId: ACTOR_ID,
        };

        await activityRepository.create(tx as never, data);

        expect(create).toHaveBeenCalledWith({
            data: {
                action: "COMMENT_CREATED",
                projectId: PROJECT_ID,
                actorId: ACTOR_ID,
                taskId: undefined,
                metadata: undefined,
            },
        });
    });

    it("lists only the requested project's activities using stable ordering", async () => {
        const result = await activityRepository.findMany(PROJECT_ID, query);

        expect(result).toEqual([[{ id: "activity-1" }], 11]);
        expect(findMany).toHaveBeenCalledExactlyOnceWith({
            where: { projectId: PROJECT_ID },
            skip: 10,
            take: 5,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            include: {
                actor: { select: { id: true, name: true, email: true } },
                task: { select: { id: true, title: true, status: true } },
            },
        });
        expect(count).toHaveBeenCalledExactlyOnceWith({
            where: { projectId: PROJECT_ID },
        });
        expect(transaction).toHaveBeenCalledOnce();
    });

    it("scopes both queries to the same project and task", async () => {
        await activityRepository.findMany(PROJECT_ID, { page: 1, limit: 10 }, TASK_ID);

        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { projectId: PROJECT_ID, taskId: TASK_ID },
            skip: 0,
            take: 10,
        }));
        expect(count).toHaveBeenCalledWith({
            where: { projectId: PROJECT_ID, taskId: TASK_ID },
        });
    });

    it("does not treat an empty task ID as a task filter", async () => {
        await activityRepository.findMany(PROJECT_ID, { page: 1, limit: 10 }, "");

        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { projectId: PROJECT_ID },
        }));
        expect(count).toHaveBeenCalledWith({ where: { projectId: PROJECT_ID } });
    });

    it("returns empty results and count without inventing activities", async () => {
        findMany.mockResolvedValue([]);
        count.mockResolvedValue(0);

        expect(await activityRepository.findMany(PROJECT_ID, { page: 2, limit: 10 }))
            .toEqual([[], 0]);
    });

    it("propagates a database read error", async () => {
        findMany.mockRejectedValue(new Error("db unavailable"));

        await expect(
            activityRepository.findMany(PROJECT_ID, { page: 1, limit: 10 }),
        ).rejects.toThrow("db unavailable");
    });
});
