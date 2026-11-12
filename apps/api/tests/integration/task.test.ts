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
    name: string;
    email: string;
    role: Role;
}

describe("Task API", () => {
    let owner: TestUser;
    let admin: TestUser;
    let member: TestUser;
    let outsider: TestUser;
    let projectId: string;
    let taskId: string;

    async function createUser(
        email: string,
    ): Promise<TestUser> {
        const user = await prisma.user.create({
            data: {
                name: email.split("@")[0],
                email,
                passwordHash: "test-password-hash",
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        trackUser(user.id);

        return user;
    }

    async function createProject(ownerId: string) {
        const project = await prisma.project.create({
            data: {
                name: `Task Test Project ${crypto.randomUUID()}`,
                ownerId,
                members: {
                    create: {
                        userId: ownerId,
                        role: "OWNER",
                    },
                },
            },
        });

        trackProject(project.id);

        return project;
    }

    async function createTask(
        creatorId: string,
        projectId: string,
        assigneeId?: string,
    ) {
        return prisma.task.create({
            data: {
                title: "Test Task",
                description: "Task description",
                projectId,
                creatorId,
                assigneeId,
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

        const project = await createProject(owner.id);

        projectId = project.id;

        await prisma.projectMember.createMany({
            data: [
                {
                    projectId,
                    userId: admin.id,
                    role: "ADMIN",
                },
                {
                    projectId,
                    userId: member.id,
                    role: "MEMBER",
                },
            ],
        });

        const task = await createTask(
            owner.id,
            projectId,
            member.id,
        );

        taskId = task.id;
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
                .get(`/api/v1/projects/${projectId}/tasks`);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // CREATE TASK

    describe("POST /projects/:projectId/tasks", () => {
        it("should allow OWNER to create a task", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(owner))
                .send({
                    title: "New Task",
                    description: "Task description",
                    priority: "HIGH",
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe("New Task");
        });

        it("should allow ADMIN to create a task", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(admin))
                .send({
                    title: "Admin Task",
                });

            expect(response.status).toBe(201);
        });

        it("should prevent MEMBER from creating a task", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(member))
                .send({
                    title: "Member Task",
                });

            expect(response.status).toBe(403);
        });

        it("should prevent outsider from creating a task", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(outsider))
                .send({
                    title: "Outsider Task",
                });

            expect(response.status).toBe(404);
        });

        it("should reject a title shorter than 2 characters", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(owner))
                .send({
                    title: "A",
                });

            expect(response.status).toBe(400);
        });

        it("should reject an invalid priority", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(owner))
                .send({
                    title: "Invalid Priority Task",
                    priority: "SUPER_HIGH",
                });

            expect(response.status).toBe(400);
        });

        it("should reject an invalid assignee ID", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(owner))
                .send({
                    title: "Invalid Assignee Task",
                    assigneeId: "invalid-id",
                });

            expect(response.status).toBe(400);
        });

        it("should reject an assignee outside the project", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(owner))
                .send({
                    title: "Invalid Assignee Task",
                    assigneeId: outsider.id,
                });

            expect(response.status).toBe(400);
        });
    });

    // GET TASKS

    describe("GET /projects/:projectId/tasks", () => {
        it("should allow OWNER to list tasks", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });

        it("should allow ADMIN to list tasks", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(admin));

            expect(response.status).toBe(200);
        });

        it("should allow MEMBER to list tasks", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(member));

            expect(response.status).toBe(200);
        });

        it("should prevent outsider from listing tasks", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks`)
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
        });

        it("should filter tasks by status", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks?status=TODO`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(
                response.body.data.every(
                    (task: { status: string }) =>
                        task.status === "TODO",
                ),
            ).toBe(true);
        });

        it("should filter tasks by priority", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks?priority=MEDIUM`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
        });

        it("should return pagination information", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks?page=1&limit=5`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.pagination).toMatchObject({
                page: 1,
                limit: 5,
            });
        });

        it("should reject an invalid page number", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks?page=0`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });
    });

    // GET TASK BY ID

    describe("GET /projects/:projectId/tasks/:taskId", () => {
        it("should allow OWNER to get a task", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(taskId);
        });

        it("should allow MEMBER to get a task", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(member));

            expect(response.status).toBe(200);
        });

        it("should prevent outsider from getting a task", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
        });

        it("should return 404 for a non-existing task", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/projects/${projectId}/tasks/${crypto.randomUUID()}`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
        });

        it("should reject an invalid task ID", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/tasks/invalid-id`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });
    });

    // UPDATE TASK

    describe("PATCH /projects/:projectId/tasks/:taskId", () => {
        it("should allow OWNER to update a task", async () => {
            const response = await request(app)
                .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(owner))
                .send({
                    title: "Updated Task",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.title).toBe("Updated Task");
        });

        it("should allow ADMIN to update a task", async () => {
            const response = await request(app)
                .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(admin))
                .send({
                    priority: "HIGH",
                });

            expect(response.status).toBe(200);
        });

        it("should allow MEMBER assignee to update task status", async () => {
            const response = await request(app)
                .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(member))
                .send({
                    status: "IN_PROGRESS",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe("IN_PROGRESS");
        });

        it("should prevent MEMBER from changing task title", async () => {
            const response = await request(app)
                .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(member))
                .send({
                    title: "Unauthorized Update",
                });

            expect(response.status).toBe(403);
        });

        it("should prevent outsider from updating a task", async () => {
            const response = await request(app)
                .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(outsider))
                .send({
                    title: "Unauthorized Update",
                });

            expect(response.status).toBe(404);
        });

        it("should reject an empty update body", async () => {
            const response = await request(app)
                .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(owner))
                .send({});

            expect(response.status).toBe(400);
        });

        it("should reject an invalid task status", async () => {
            const response = await request(app)
                .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(owner))
                .send({
                    status: "INVALID_STATUS",
                });

            expect(response.status).toBe(400);
        });

        it("should return 404 for a non-existing task", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/tasks/${crypto.randomUUID()}`,
                )
                .set(createAuthHeader(owner))
                .send({
                    title: "Updated Task",
                });

            expect(response.status).toBe(404);
        });
    });

    // DELETE TASK

    describe("DELETE /projects/:projectId/tasks/:taskId", () => {
        it("should allow OWNER to delete a task", async () => {
            const response = await request(app)
                .delete(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const deletedTask = await prisma.task.findUnique({
                where: { id: taskId },
            });

            expect(deletedTask).toBeNull();
        });

        it("should allow ADMIN to delete a task", async () => {
            const task = await createTask(owner.id, projectId);

            const response = await request(app)
                .delete(`/api/v1/projects/${projectId}/tasks/${task.id}`)
                .set(createAuthHeader(admin));

            expect(response.status).toBe(200);
        });

        it("should prevent MEMBER from deleting a task", async () => {
            const response = await request(app)
                .delete(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(member));

            expect(response.status).toBe(403);
        });

        it("should prevent outsider from deleting a task", async () => {
            const response = await request(app)
                .delete(`/api/v1/projects/${projectId}/tasks/${taskId}`)
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
        });

        it("should return 404 for a non-existing task", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/tasks/${crypto.randomUUID()}`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
        });
    });
});