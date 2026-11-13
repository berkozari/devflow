
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import request from "supertest";
import type { Role } from "../../src/generated/prisma/client.js";

import app from "../../src/app.js";

import {
    prisma,
    trackUser,
    trackProject,
    cleanupTestData,
} from "../helpers/test-database.js";

import { createAuthHeader } from "../helpers/test-auth.js";

interface TestUser {
    id: string;
    email: string;
    role: Role;
}

describe("Comment API", () => {
    let owner: TestUser;
    let admin: TestUser;
    let member: TestUser;
    let outsider: TestUser;

    let projectId: string;
    let taskId: string;
    let commentId: string;

    async function createUser(email: string): Promise<TestUser> {
        const user = await prisma.user.create({
            data: {
                name: email.split("@")[0],
                email,
                passwordHash: "test-password-hash",
            },
            select: {
                id: true,
                email: true,
                role: true,
            },
        });

        trackUser(user.id);

        return user;
    }

    async function createTask() {
        const task = await prisma.task.create({
            data: {
                title: "Test Task",
                projectId,
                creatorId: owner.id,
            },
        });

        return task;
    }

    async function createComment(authorId: string) {
        return prisma.comment.create({
            data: {
                content: "Test comment",
                taskId,
                authorId,
            },
        });
    }

    beforeAll(async () => {
        await prisma.$connect();
    });

    beforeEach(async () => {
        owner = await createUser(
            `owner-${crypto.randomUUID()}@test.com`,
        );

        admin = await createUser(
            `admin-${crypto.randomUUID()}@test.com`,
        );

        member = await createUser(
            `member-${crypto.randomUUID()}@test.com`,
        );

        outsider = await createUser(
            `outsider-${crypto.randomUUID()}@test.com`,
        );

        const project = await prisma.project.create({
            data: {
                name: "Comment Test Project",
                ownerId: owner.id,
                members: {
                    create: [
                        {
                            userId: owner.id,
                            role: "OWNER",
                        },
                        {
                            userId: admin.id,
                            role: "ADMIN",
                        },
                        {
                            userId: member.id,
                            role: "MEMBER",
                        },
                    ],
                },
            },
        });

        projectId = project.id;
        trackProject(projectId);

        const task = await createTask();
        taskId = task.id;

        const comment = await createComment(member.id);
        commentId = comment.id;
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    // AUTHENTICATION

    describe("Authentication", () => {
        it("should return 401 without an access token", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                );

            expect(response.status).toBe(401);
        });
    });

    // GET COMMENTS

    describe("GET /projects/:projectId/tasks/:taskId/comments", () => {
        it("should allow OWNER to list comments", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });

        it("should allow ADMIN to list comments", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(admin));

            expect(response.status).toBe(200);
        });

        it("should allow MEMBER to list comments", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(member));

            expect(response.status).toBe(200);
        });

        it("should prevent outsider from listing comments", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
        });

        it("should return pagination information", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments?page=1&limit=5`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.pagination).toMatchObject({
                page: 1,
                limit: 5,
            });
        });

        it("should reject an invalid page number", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments?page=0`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });

        it("should reject a limit greater than 100", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments?limit=101`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });

        it("should return 404 for a non-existing task", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/00000000-0000-4000-8000-000000000001/comments`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
        });
    });

    // CREATE COMMENTS

    describe("POST /projects/:projectId/tasks/:taskId/comments", () => {
        it("should allow OWNER to create a comment", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(owner))
                .send({
                    content: "Owner comment",
                });

            expect(response.status).toBe(201);
            expect(response.body.data.content).toBe("Owner comment");
        });

        it("should allow ADMIN to create a comment", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(admin))
                .send({
                    content: "Admin comment",
                });

            expect(response.status).toBe(201);
        });

        it("should allow MEMBER to create a comment", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Member comment",
                });

            expect(response.status).toBe(201);
        });

        it("should prevent outsider from creating a comment", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(outsider))
                .send({
                    content: "Unauthorized comment",
                });

            expect(response.status).toBe(404);
        });

        it("should reject an empty comment", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(owner))
                .send({
                    content: "",
                });

            expect(response.status).toBe(400);
        });

        it("should reject a comment exceeding 5000 characters", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(owner))
                .send({
                    content: "A".repeat(5001),
                });

            expect(response.status).toBe(400);
        });

        it("should reject whitespace-only comments", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(owner))
                .send({
                    content: "   ",
                });

            expect(response.status).toBe(400);
        });
    });

    // UPDATE COMMENTS

    describe("PATCH /projects/:projectId/tasks/:taskId/comments/:commentId", () => {
        it("should allow comment author to update comment", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Updated comment",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.content).toBe("Updated comment");
        });

        it("should prevent OWNER from updating another user's comment", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
                )
                .set(createAuthHeader(owner))
                .send({
                    content: "Unauthorized update",
                });

            expect(response.status).toBe(403);
        });

        it("should prevent ADMIN from updating another user's comment", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
                )
                .set(createAuthHeader(admin))
                .send({
                    content: "Unauthorized update",
                });

            expect(response.status).toBe(403);
        });

        it("should reject an empty comment update", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "",
                });

            expect(response.status).toBe(400);
        });

        it("should return 404 for a non-existing comment", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/00000000-0000-4000-8000-000000000001`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Updated comment",
                });

            expect(response.status).toBe(404);
        });

        it("should reject an invalid comment ID", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/invalid-id`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Updated comment",
                });

            expect(response.status).toBe(400);
        });
    });

    // DELETE COMMENTS

    describe("DELETE /projects/:projectId/tasks/:taskId/comments/:commentId", () => {
        it("should allow comment author to delete comment", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
                )
                .set(createAuthHeader(member));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const deletedComment = await prisma.comment.findUnique({
                where: { id: commentId },
            });

            expect(deletedComment).toBeNull();
        });

        it("should prevent OWNER from deleting another user's comment", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(403);
        });

        it("should prevent ADMIN from deleting another user's comment", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
                )
                .set(createAuthHeader(admin));

            expect(response.status).toBe(403);
        });

        it("should prevent outsider from deleting comment", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
                )
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
        });

        it("should return 404 for a non-existing comment", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments/00000000-0000-4000-8000-000000000001`,
                )
                .set(createAuthHeader(member));

            expect(response.status).toBe(404);
        });
    });

    // MENTION TESTS

    describe("Comment Mentions", () => {
        it("should create a comment with a mentioned user", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Please check this task",
                    mentionedUserIds: [admin.id],
                });

            expect(response.status).toBe(201);

            expect(response.body.data.mentions).toHaveLength(1);

            expect(
                response.body.data.mentions[0].user.id,
            ).toBe(admin.id);
        });

        it("should allow mentioning multiple project members", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Please check this task",
                    mentionedUserIds: [
                        admin.id,
                        owner.id,
                    ],
                });

            expect(response.status).toBe(201);
            expect(response.body.data.mentions).toHaveLength(2);
        });

        it("should allow creating a comment without mentions", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Regular comment",
                });

            expect(response.status).toBe(201);
            expect(response.body.data.mentions).toHaveLength(0);
        });

        it("should reject mentioning a user outside the project", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Please check this task",
                    mentionedUserIds: [outsider.id],
                });

            expect(response.status).toBe(400);
        });

        it("should not create duplicate mentions", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Please check this task",
                    mentionedUserIds: [
                        admin.id,
                        admin.id,
                    ],
                });

            expect(response.status).toBe(201);
            expect(response.body.data.mentions).toHaveLength(1);
        });

        it("should reject invalid mentioned user IDs", async () => {
            const response = await request(app)
                .post(
                    `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
                )
                .set(createAuthHeader(member))
                .send({
                    content: "Please check this task",
                    mentionedUserIds: ["invalid-id"],
                });

            expect(response.status).toBe(400);
        });
    });
});
