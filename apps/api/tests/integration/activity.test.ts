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

import app from "../../src/app.js";
import type { Role } from "../../src/generated/prisma/client.js";
import {
    prisma,
    trackUser,
    trackProject,
    cleanupTestData,
} from "../helpers/test-database.js";
import { createAuthHeader } from "../helpers/test-auth.js";

// These endpoints are mounted below /api/v1/projects/:projectId/activities.
interface TestUser {
    id: string;
    email: string;
    role: Role;
}

async function createUser(label: string): Promise<TestUser> {
    const user = await prisma.user.create({
        data: {
            name: label,
            email: `activity-${label}-${crypto.randomUUID()}@test.com`,
            passwordHash: "test-password-hash",
        },
        select: { id: true, email: true, role: true },
    });
    trackUser(user.id);
    return user;
}

async function createProject(ownerId: string) {
    const project = await prisma.project.create({
        data: {
            name: `Activity Test Project ${crypto.randomUUID()}`,
            ownerId,
            members: { create: { userId: ownerId, role: "OWNER" } },
        },
    });
    trackProject(project.id);
    return project;
}

describe("Activity API Integration", () => {
    let owner: TestUser;
    let member: TestUser;
    let outsider: TestUser;
    let projectId: string;
    let otherProjectId: string;
    let taskId: string;

    const projectActivities = () =>
        `/api/v1/projects/${projectId}/activities`;
    const taskActivities = (id: string = taskId) =>
        `${projectActivities()}/tasks/${id}`;

    async function createActivity(options: {
        projectId?: string;
        taskId?: string;
        actorId?: string;
        action?: "TASK_CREATED" | "TASK_UPDATED" | "COMMENT_CREATED";
        createdAt?: Date;
    } = {}) {
        return prisma.activityLog.create({
            data: {
                action: options.action ?? "TASK_CREATED",
                projectId: options.projectId ?? projectId,
                actorId: options.actorId ?? owner.id,
                taskId: options.taskId,
                createdAt: options.createdAt,
            },
        });
    }

    beforeAll(async () => {
        await prisma.$connect();
    });

    beforeEach(async () => {
        owner = await createUser("owner");
        member = await createUser("member");
        outsider = await createUser("outsider");

        const project = await createProject(owner.id);
        projectId = project.id;
        const anotherProject = await createProject(outsider.id);
        otherProjectId = anotherProject.id;

        await prisma.projectMember.create({
            data: { projectId, userId: member.id, role: "MEMBER" },
        });

        const task = await prisma.task.create({
            data: {
                title: "Activity test task",
                projectId,
                creatorId: owner.id,
            },
        });
        taskId = task.id;
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        try {
            await cleanupTestData();
        } finally {
            await prisma.$disconnect();
        }
    });

    describe("GET /projects/:projectId/activities", () => {
        it("requires authentication", async () => {
            const response = await request(app).get(projectActivities());
            expect(response.status).toBe(401);
        });

        it("allows an OWNER to list project history", async () => {
            const entry = await createActivity({ taskId });
            const response = await request(app)
                .get(projectActivities())
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0]).toMatchObject({
                id: entry.id,
                action: "TASK_CREATED",
                projectId,
                actor: { id: owner.id, email: owner.email },
                task: { id: taskId, title: "Activity test task", status: "TODO" },
            });
            expect(response.body.pagination).toEqual({
                page: 1, limit: 10, total: 1, totalPages: 1,
            });
        });

        it("allows an ordinary project MEMBER", async () => {
            await createActivity({ actorId: member.id, taskId });
            const response = await request(app)
                .get(projectActivities())
                .set(createAuthHeader(member));

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].actor.id).toBe(member.id);
        });

        it("returns 404 to a user outside the project", async () => {
            await createActivity({ taskId });
            const response = await request(app)
                .get(projectActivities())
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body).not.toHaveProperty("data");
        });

        it("rejects access to another user's project even for a project OWNER", async () => {
            await createActivity({ projectId: otherProjectId, actorId: outsider.id });
            const response = await request(app)
                .get(`/api/v1/projects/${otherProjectId}/activities`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
            expect(response.body).not.toHaveProperty("data");
        });

        it("excludes entries belonging to other projects", async () => {
            await createActivity({ taskId });
            await createActivity({ projectId: otherProjectId, actorId: outsider.id });
            const response = await request(app)
                .get(projectActivities())
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.pagination.total).toBe(1);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].projectId).toBe(projectId);
        });

        it("returns empty history with zero total pages", async () => {
            const response = await request(app)
                .get(projectActivities())
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                page: 1, limit: 10, total: 0, totalPages: 0,
            });
        });

        it("sorts newest entries first and paginates deterministically", async () => {
            const first = await createActivity({
                action: "TASK_CREATED",
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
            });
            const middle = await createActivity({
                action: "TASK_UPDATED",
                createdAt: new Date("2026-01-02T00:00:00.000Z"),
            });
            const last = await createActivity({
                action: "COMMENT_CREATED",
                createdAt: new Date("2026-01-03T00:00:00.000Z"),
            });

            const page1 = await request(app)
                .get(projectActivities())
                .query({ page: 1, limit: 2 })
                .set(createAuthHeader(owner));
            const page2 = await request(app)
                .get(projectActivities())
                .query({ page: 2, limit: 2 })
                .set(createAuthHeader(owner));

            expect(page1.status).toBe(200);
            expect(page2.status).toBe(200);
            expect(page1.body.data.map((row: { id: string }) => row.id))
                .toEqual([last.id, middle.id]);
            expect(page2.body.data.map((row: { id: string }) => row.id))
                .toEqual([first.id]);
            expect(page1.body.pagination).toEqual({
                page: 1, limit: 2, total: 3, totalPages: 2,
            });
            expect(page2.body.pagination).toEqual({
                page: 2, limit: 2, total: 3, totalPages: 2,
            });
        });

        it("returns empty data when the requested page is past the end", async () => {
            await createActivity();
            const response = await request(app)
                .get(projectActivities())
                .query({ page: 50, limit: 10 })
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                page: 50, limit: 10, total: 1, totalPages: 1,
            });
        });

        it.each([
            { page: 0 },
            { page: -1 },
            { limit: 0 },
            { limit: 101 },
            { page: "invalid" },
            { limit: "1.5" },
        ])("rejects invalid pagination: %j", async (query) => {
            const response = await request(app)
                .get(projectActivities())
                .query(query)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("rejects an invalid project UUID", async () => {
            const response = await request(app)
                .get("/api/v1/projects/not-a-uuid/activities")
                .set(createAuthHeader(owner));
            expect(response.status).toBe(400);
        });
    });

    describe("GET /projects/:projectId/activities/tasks/:taskId", () => {
        it("requires authentication", async () => {
            const response = await request(app).get(taskActivities());
            expect(response.status).toBe(401);
        });

        it("returns only history linked to the selected task", async () => {
            const firstTaskActivity = await createActivity({ taskId });
            await createActivity(); // Project event: no taskId.
            const otherTask = await prisma.task.create({
                data: { title: "Other task", projectId, creatorId: owner.id },
            });
            await createActivity({ taskId: otherTask.id });

            const response = await request(app)
                .get(taskActivities())
                .set(createAuthHeader(member));

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].id).toBe(firstTaskActivity.id);
            expect(response.body.pagination).toEqual({
                page: 1, limit: 10, total: 1, totalPages: 1,
            });
        });

        it("returns empty task history when the task exists without activities", async () => {
            const response = await request(app)
                .get(taskActivities())
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination.total).toBe(0);
        });

        it("returns 404 for a non-member before revealing task history", async () => {
            await createActivity({ taskId });
            const response = await request(app)
                .get(taskActivities())
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
            expect(response.body).not.toHaveProperty("data");
        });

        it("returns 404 for a task absent from the project", async () => {
            const response = await request(app)
                .get(taskActivities(crypto.randomUUID()))
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
        });

        it("does not expose a task belonging to a different project", async () => {
            const foreignTask = await prisma.task.create({
                data: {
                    title: "Private other-project task",
                    projectId: otherProjectId,
                    creatorId: outsider.id,
                },
            });
            await createActivity({
                projectId: otherProjectId,
                taskId: foreignTask.id,
                actorId: outsider.id,
            });

            const response = await request(app)
                .get(taskActivities(foreignTask.id))
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
            expect(response.body).not.toHaveProperty("data");
        });

        it("rejects an invalid task UUID", async () => {
            const response = await request(app)
                .get(taskActivities("invalid-task"))
                .set(createAuthHeader(owner));
            expect(response.status).toBe(400);
        });

        it("validates pagination on task-scoped history", async () => {
            const response = await request(app)
                .get(taskActivities())
                .query({ limit: 101 })
                .set(createAuthHeader(owner));
            expect(response.status).toBe(400);
        });
    });
});
