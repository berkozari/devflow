import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    transaction,
    findProjectMember,
    findProjectMembersByUserIds,
    findTask,
    findComment,
    createManyReturningNew,
    findMentions,
    deleteMentions,
    createNotification,
} = vi.hoisted(() => ({
    transaction: vi.fn(),
    findProjectMember: vi.fn(),
    findProjectMembersByUserIds: vi.fn(),
    findTask: vi.fn(),
    findComment: vi.fn(),
    createManyReturningNew: vi.fn(),
    findMentions: vi.fn(),
    deleteMentions: vi.fn(),
    createNotification: vi.fn(),
}));

vi.mock("../../../src/config/database.js", () => ({
    prisma: { $transaction: transaction },
}));

vi.mock("../../../src/repositories/project-member.repository.js", () => ({
    projectMemberRepository: {
        findProjectMember,
        findProjectMembersByUserIds,
    },
}));

vi.mock("../../../src/repositories/task.repository.js", () => ({
    taskRepository: { findById: findTask },
}));

vi.mock("../../../src/repositories/comment.repository.js", () => ({
    commentRepository: { findById: findComment },
}));

vi.mock("../../../src/repositories/mention.repository.js", () => ({
    mentionRepository: {
        createManyReturningNew,
        findByCommentId: findMentions,
        deleteByCommentId: deleteMentions,
    },
}));

vi.mock("../../../src/services/notification.service.js", () => ({
    notificationService: { create: createNotification },
}));

import { mentionService } from "../../../src/services/mention.service.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000002";
const COMMENT_ID = "00000000-0000-4000-8000-000000000003";
const AUTHOR_ID = "00000000-0000-4000-8000-000000000004";
const USER_A = "00000000-0000-4000-8000-000000000005";
const USER_B = "00000000-0000-4000-8000-000000000006";
const OUTSIDER_ID = "00000000-0000-4000-8000-000000000007";

// An identity-only stand-in is enough: all mocked repositories receive this tx.
const tx = { tag: "transaction-client" };
const storedMentions = [
    {
        id: "mention-1",
        userId: USER_A,
        commentId: COMMENT_ID,
        user: { id: USER_A, name: "User A", email: "a@test.com" },
    },
];

const create = (actorId: string, userIds: string[]) =>
    mentionService.create(PROJECT_ID, TASK_ID, COMMENT_ID, actorId, { userIds });

const findByComment = (actorId: string) =>
    mentionService.findByComment(PROJECT_ID, TASK_ID, COMMENT_ID, actorId);

const removeByComment = (actorId: string) =>
    mentionService.deleteByComment(PROJECT_ID, TASK_ID, COMMENT_ID, actorId);

describe("Mention Service", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        findProjectMember.mockResolvedValue({ userId: AUTHOR_ID, role: "MEMBER" });
        findTask.mockResolvedValue({ id: TASK_ID, projectId: PROJECT_ID });
        findComment.mockResolvedValue({ id: COMMENT_ID, authorId: AUTHOR_ID });
        findProjectMembersByUserIds.mockImplementation(
            async (_projectId: string, ids: string[]) =>
                ids.map((userId) => ({ userId })),
        );
        createManyReturningNew.mockResolvedValue([{ userId: USER_A }]);
        findMentions.mockResolvedValue(storedMentions);
        deleteMentions.mockResolvedValue({ count: 1 });
        createNotification.mockResolvedValue({ id: "notification-1" });
        transaction.mockImplementation(
            async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
        );
    });

    describe("create", () => {
        it("creates mentions in a transaction and notifies only newly inserted users", async () => {
            const result = await create(AUTHOR_ID, [USER_A]);

            expect(result).toEqual(storedMentions);
            expect(findProjectMember).toHaveBeenCalledWith(PROJECT_ID, AUTHOR_ID);
            expect(findTask).toHaveBeenCalledWith(PROJECT_ID, TASK_ID);
            expect(findComment).toHaveBeenCalledWith(TASK_ID, COMMENT_ID);
            expect(findProjectMembersByUserIds).toHaveBeenCalledWith(
                PROJECT_ID,
                [USER_A],
            );
            expect(transaction).toHaveBeenCalledOnce();
            expect(createManyReturningNew).toHaveBeenCalledWith(
                COMMENT_ID,
                [USER_A],
                tx,
            );
            expect(createNotification).toHaveBeenCalledWith(tx, {
                type: "COMMENT_MENTIONED",
                title: "You were mentioned in a comment",
                userId: USER_A,
                actorId: AUTHOR_ID,
                projectId: PROJECT_ID,
                taskId: TASK_ID,
                metadata: { commentId: COMMENT_ID },
            });
            expect(findMentions).toHaveBeenCalledWith(COMMENT_ID, tx);
        });

        it("notifies each newly inserted user exactly once", async () => {
            createManyReturningNew.mockResolvedValue([
                { userId: USER_A },
                { userId: USER_B },
            ]);

            await create(AUTHOR_ID, [USER_A, USER_B]);

            expect(createNotification).toHaveBeenCalledTimes(2);
            expect(createNotification.mock.calls.map((args) => args[1].userId)).toEqual([
                USER_A,
                USER_B,
            ]);
        });

        it("deduplicates user IDs defensively before validating project membership", async () => {
            await create(AUTHOR_ID, [USER_A, USER_A]);
            expect(findProjectMembersByUserIds).toHaveBeenCalledWith(
                PROJECT_ID,
                [USER_A],
            );
            expect(createManyReturningNew).toHaveBeenCalledWith(
                COMMENT_ID,
                [USER_A],
                tx,
            );
        });

        it("does not notify users who already have a mention", async () => {
            createManyReturningNew.mockResolvedValue([]);
            await create(AUTHOR_ID, [USER_A]);
            expect(createNotification).not.toHaveBeenCalled();
            expect(findMentions).toHaveBeenCalledWith(COMMENT_ID, tx);
        });

        it("handles an empty user list without writing mentions or notifications", async () => {
            // HTTP schema rejects an empty array; service itself handles it safely.
            const result = await create(AUTHOR_ID, []);
            expect(result).toEqual(storedMentions);
            expect(findProjectMembersByUserIds).not.toHaveBeenCalled();
            expect(createManyReturningNew).not.toHaveBeenCalled();
            expect(createNotification).not.toHaveBeenCalled();
            expect(findMentions).toHaveBeenCalledWith(COMMENT_ID, tx);
        });

        it("rejects an actor who is not a project member", async () => {
            findProjectMember.mockResolvedValue(null);
            await expect(create(OUTSIDER_ID, [USER_A])).rejects.toMatchObject({
                statusCode: 404,
                message: "Project not found",
            });
            expect(findTask).not.toHaveBeenCalled();
            expect(transaction).not.toHaveBeenCalled();
        });

        it("rejects a missing task", async () => {
            findTask.mockResolvedValue(null);
            await expect(create(AUTHOR_ID, [USER_A])).rejects.toMatchObject({
                statusCode: 404,
                message: "Task not found",
            });
            expect(findComment).not.toHaveBeenCalled();
            expect(transaction).not.toHaveBeenCalled();
        });

        it("rejects a missing comment", async () => {
            findComment.mockResolvedValue(null);
            await expect(create(AUTHOR_ID, [USER_A])).rejects.toMatchObject({
                statusCode: 404,
                message: "Comment not found",
            });
            expect(transaction).not.toHaveBeenCalled();
        });

        it("forbids project members who did not author the comment", async () => {
            await expect(create(USER_A, [USER_B])).rejects.toMatchObject({
                statusCode: 403,
                message: "Only the comment author can manage mentions",
            });
            expect(transaction).not.toHaveBeenCalled();
        });

        it("rejects self-mentions", async () => {
            await expect(create(AUTHOR_ID, [AUTHOR_ID])).rejects.toMatchObject({
                statusCode: 400,
                message: "You cannot mention yourself",
            });
            expect(findProjectMembersByUserIds).not.toHaveBeenCalled();
            expect(transaction).not.toHaveBeenCalled();
        });

        it("rejects a mix of project members and outsiders", async () => {
            findProjectMembersByUserIds.mockResolvedValue([{ userId: USER_A }]);
            await expect(create(AUTHOR_ID, [USER_A, OUTSIDER_ID])).rejects.toMatchObject({
                statusCode: 400,
                message: "All mentioned users must be project members",
            });
            expect(transaction).not.toHaveBeenCalled();
        });

        it("propagates mention insertion failures without sending notifications", async () => {
            const failure = new Error("Insert failed");
            createManyReturningNew.mockRejectedValue(failure);
            await expect(create(AUTHOR_ID, [USER_A])).rejects.toBe(failure);
            expect(createNotification).not.toHaveBeenCalled();
        });

        it("propagates notification failures from the transaction", async () => {
            const failure = new Error("Notification failed");
            createNotification.mockRejectedValue(failure);
            await expect(create(AUTHOR_ID, [USER_A])).rejects.toBe(failure);
            expect(findMentions).not.toHaveBeenCalled();
        });
    });

    describe("findByComment", () => {
        it("allows any project member to list comment mentions", async () => {
            const result = await findByComment(USER_B);
            expect(result).toEqual(storedMentions);
            expect(findMentions).toHaveBeenCalledWith(COMMENT_ID);
        });

        it("hides project information from outsiders", async () => {
            findProjectMember.mockResolvedValue(null);
            await expect(findByComment(OUTSIDER_ID)).rejects.toMatchObject({
                statusCode: 404,
                message: "Project not found",
            });
            expect(findMentions).not.toHaveBeenCalled();
        });

        it("rejects an unknown task", async () => {
            findTask.mockResolvedValue(null);
            await expect(findByComment(AUTHOR_ID)).rejects.toMatchObject({
                statusCode: 404,
                message: "Task not found",
            });
            expect(findMentions).not.toHaveBeenCalled();
        });

        it("rejects an unknown comment", async () => {
            findComment.mockResolvedValue(null);
            await expect(findByComment(AUTHOR_ID)).rejects.toMatchObject({
                statusCode: 404,
                message: "Comment not found",
            });
            expect(findMentions).not.toHaveBeenCalled();
        });
    });

    describe("deleteByComment", () => {
        it("lets only the comment author remove its mentions", async () => {
            const result = await removeByComment(AUTHOR_ID);
            expect(result).toEqual({ count: 1 });
            expect(deleteMentions).toHaveBeenCalledWith(COMMENT_ID);
        });

        it("hides project information from outsiders", async () => {
            findProjectMember.mockResolvedValue(null);
            await expect(removeByComment(OUTSIDER_ID)).rejects.toMatchObject({
                statusCode: 404,
                message: "Project not found",
            });
            expect(deleteMentions).not.toHaveBeenCalled();
        });

        it("rejects an unknown task", async () => {
            findTask.mockResolvedValue(null);
            await expect(removeByComment(AUTHOR_ID)).rejects.toMatchObject({
                statusCode: 404,
                message: "Task not found",
            });
            expect(deleteMentions).not.toHaveBeenCalled();
        });

        it("rejects an unknown comment", async () => {
            findComment.mockResolvedValue(null);
            await expect(removeByComment(AUTHOR_ID)).rejects.toMatchObject({
                statusCode: 404,
                message: "Comment not found",
            });
            expect(deleteMentions).not.toHaveBeenCalled();
        });

        it("forbids project members who did not author the comment", async () => {
            await expect(removeByComment(USER_A)).rejects.toMatchObject({
                statusCode: 403,
                message: "Only the comment author can manage mentions",
            });
            expect(deleteMentions).not.toHaveBeenCalled();
        });
    });
});
