import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import type { Role } from "../../src/generated/prisma/client.js";
import { prisma, trackUser, trackProject, cleanupTestData } from "../helpers/test-database.js";
import { createAuthHeader } from "../helpers/test-auth.js";

const BASE = "/api/v1/dashboard";


type TestUser = { id: string; email: string; role: Role };

describe("Dashboard API Integration", () => {
    let owner: TestUser;

    beforeAll(async () => { await prisma.$connect(); });

    beforeEach(async () => {
        const user = await prisma.user.create({
            data: {
                name: "Dashboard Test User",
                email: `dashboard-${crypto.randomUUID()}@test.com`,
                passwordHash: "test-only-password-hash",
            },
            select: { id: true, email: true, role: true },
        });
        trackUser(user.id);
        owner = { id: user.id, email: user.email, role: user.role };
    });

    afterEach(async () => { await cleanupTestData(); });
    afterAll(async () => {
        await cleanupTestData();
        await prisma.$disconnect();
    });

    it("requires authentication for overview", async () => {
        const response = await request(app).get(`${BASE}/overview`);
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it("returns an empty overview for a user without projects", async () => {
        const response = await request(app)
            .get(`${BASE}/overview`)
            .set(createAuthHeader(owner));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.statistics.totalProjects).toBe(0);
    });

    it("rejects an invalid projectId", async () => {
        const response = await request(app)
            .get(`${BASE}/overview?projectId=invalid-id`)
            .set(createAuthHeader(owner));
        expect(response.status).toBe(400);
    });

    it("rejects a reversed timestamp range", async () => {
        const response = await request(app)
            .get(`${BASE}/overview`)
            .query({
                startDate: "2026-11-15T10:00:00Z",
                endDate: "2026-11-14T10:00:00Z",
            })
            .set(createAuthHeader(owner));
        expect(response.status).toBe(400);
    });

    it("does not expose a project the user cannot access", async () => {
        // The caller has no project membership or ownership for this ID.
        const response = await request(app)
            .get(`${BASE}/overview`)
            .query({ projectId: crypto.randomUUID() })
            .set(createAuthHeader(owner));
        expect(response.status).toBe(404);
    });

    it("returns only an owned project in project-filtered overview", async () => {
        const project = await prisma.project.create({
            data: { name: "Dashboard Project", ownerId: owner.id },
            select: { id: true },
        });
        trackProject(project.id);

        const response = await request(app)
            .get(`${BASE}/overview`)
            .query({ projectId: project.id })
            .set(createAuthHeader(owner));
        expect(response.status).toBe(200);
        expect(response.body.data.statistics.totalProjects).toBe(1);
    });


    describe("Dashboard endpoints and cross-project isolation", () => {
        async function createProject(ownerId = owner.id, name = "Dashboard Metrics") {
            const project = await prisma.project.create({
                data: { name, ownerId, status: "ACTIVE" },
            });
            trackProject(project.id);
            return project;
        }

        async function createUser(name: string): Promise<TestUser> {
            const user = await prisma.user.create({
                data: {
                    name,
                    email: `dashboard-extra-${crypto.randomUUID()}@test.com`,
                    passwordHash: "test-only-password-hash",
                },
                select: { id: true, email: true, role: true },
            });
            trackUser(user.id);
            return user;
        }

        async function createTask(projectId: string, options: {
            status?: "TODO" | "IN_PROGRESS" | "DONE";
            assigneeId?: string | null;
            dueDate?: Date;
            createdAt?: Date;
        } = {}) {
            return prisma.task.create({
                data: {
                    title: `Dashboard Task ${crypto.randomUUID()}`,
                    projectId,
                    creatorId: owner.id,
                    status: options.status ?? "TODO",
                    assigneeId: options.assigneeId,
                    dueDate: options.dueDate,
                    createdAt: options.createdAt,
                },
            });
        }

        it("requires authentication for the remaining dashboard endpoints", async () => {
            for (const endpoint of ["overdue-tasks", "workload", "activities"]) {
                const response = await request(app).get(`${BASE}/${endpoint}`);
                expect(response.status).toBe(401);
            }
        });

        it("returns empty arrays on list endpoints when the user has no accessible projects", async () => {
            for (const endpoint of ["overdue-tasks", "workload", "activities"]) {
                const response = await request(app)
                    .get(`${BASE}/${endpoint}`)
                    .set(createAuthHeader(owner));
                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({ success: true, data: [] });
            }
        });

        it("computes overview project and task counts, including completed and overdue tasks", async () => {
            const project = await createProject();
            const overdue = new Date(Date.now() - 24 * 60 * 60 * 1000);
            await createTask(project.id, { status: "DONE", assigneeId: owner.id, dueDate: overdue });
            await createTask(project.id, { status: "TODO", dueDate: overdue });

            const response = await request(app)
                .get(`${BASE}/overview`)
                .set(createAuthHeader(owner));
            expect(response.status).toBe(200);
            expect(response.body.data.statistics).toMatchObject({
                totalProjects: 1,
                activeProjects: 1,
                totalTasks: 2,
                completedTasks: 1,
                overdueTasks: 1,
                unassignedTasks: 1,
                completionRate: 50,
            });
            expect(response.body.data.tasksByStatus).toEqual(expect.arrayContaining([
                expect.objectContaining({ status: "DONE", _count: { _all: 1 } }),
                expect.objectContaining({ status: "TODO", _count: { _all: 1 } }),
            ]));
            expect(response.body.data.projectProgress).toEqual(expect.arrayContaining([
                expect.objectContaining({ id: project.id, totalTasks: 2, completedTasks: 1, completionRate: 50 }),
            ]));
        });

        it("allows a project member to view a shared project's dashboard", async () => {
            const member = await createUser("Dashboard Member");
            const project = await createProject();
            await prisma.projectMember.create({
                data: { projectId: project.id, userId: member.id, role: "MEMBER" },
            });
            await createTask(project.id);

            const response = await request(app)
                .get(`${BASE}/overview`)
                .query({ projectId: project.id })
                .set(createAuthHeader(member));
            expect(response.status).toBe(200);
            expect(response.body.data.statistics).toMatchObject({ totalProjects: 1, totalTasks: 1 });
        });

        it("does not expose another user's existing project even when its ID is known", async () => {
            const outsider = await createUser("Project Outsider");
            const foreignProject = await createProject(outsider.id, "Private Project");
            const response = await request(app)
                .get(`${BASE}/overview`)
                .query({ projectId: foreignProject.id })
                .set(createAuthHeader(owner));
            expect(response.status).toBe(404);
            expect(response.body).not.toHaveProperty("data");
        });

        it("does not count tasks from unrelated projects in the unfiltered overview", async () => {
            const outsider = await createUser("Other Owner");
            const mine = await createProject();
            const theirs = await createProject(outsider.id, "Other Project");
            await createTask(mine.id);
            // task.creatorId must belong to a real user, but not necessarily the project owner.
            await createTask(theirs.id);

            const response = await request(app)
                .get(`${BASE}/overview`)
                .set(createAuthHeader(owner));
            expect(response.status).toBe(200);
            expect(response.body.data.statistics).toMatchObject({ totalProjects: 1, totalTasks: 1 });
            expect(response.body.data.projectProgress).toHaveLength(1);
            expect(response.body.data.projectProgress[0].id).toBe(mine.id);
        });

        it("returns only overdue unfinished tasks in earliest-due-date order", async () => {
            const project = await createProject();
            const now = Date.now();
            const first = await createTask(project.id, { status: "TODO", dueDate: new Date(now - 4 * 86_400_000) });
            const second = await createTask(project.id, { status: "IN_PROGRESS", dueDate: new Date(now - 86_400_000) });
            await createTask(project.id, { status: "DONE", dueDate: new Date(now - 5 * 86_400_000) });
            await createTask(project.id, { status: "TODO", dueDate: new Date(now + 86_400_000) });

            const response = await request(app)
                .get(`${BASE}/overdue-tasks`)
                .set(createAuthHeader(owner));
            expect(response.status).toBe(200);
            expect(response.body.data.map((task: { id: string }) => task.id)).toEqual([first.id, second.id]);
            expect(response.body.data[0].project.id).toBe(project.id);
        });

        it("returns open assigned task counts for workload and excludes completed or unassigned tasks", async () => {
            const project = await createProject();
            await createTask(project.id, { assigneeId: owner.id });
            await createTask(project.id, { status: "IN_PROGRESS", assigneeId: owner.id });
            await createTask(project.id, { status: "DONE", assigneeId: owner.id });
            await createTask(project.id);

            const response = await request(app)
                .get(`${BASE}/workload`)
                .set(createAuthHeader(owner));
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([
                expect.objectContaining({ user: expect.objectContaining({ id: owner.id }), totalTasks: 2 }),
            ]);
        });

        it("returns recent project activities in descending creation time", async () => {
            const project = await createProject();
            const oldEntry = await prisma.activityLog.create({
                data: {
                    projectId: project.id,
                    actorId: owner.id,
                    action: "TASK_CREATED",
                    createdAt: new Date("2026-01-01T00:00:00Z"),
                },
            });
            const newEntry = await prisma.activityLog.create({
                data: {
                    projectId: project.id,
                    actorId: owner.id,
                    action: "TASK_UPDATED",
                    createdAt: new Date("2026-02-01T00:00:00Z"),
                },
            });
            const response = await request(app)
                .get(`${BASE}/activities`)
                .set(createAuthHeader(owner));
            expect(response.status).toBe(200);
            expect(response.body.data.map((entry: { id: string }) => entry.id)).toEqual([newEntry.id, oldEntry.id]);
            expect(response.body.data[0].actor.id).toBe(owner.id);
        });

        it("filters recent activities by their createdAt timestamp", async () => {
            const project = await createProject();
            await prisma.activityLog.create({
                data: { projectId: project.id, actorId: owner.id, action: "TASK_CREATED", createdAt: new Date("2026-01-01T00:00:00Z") },
            });
            const withinRange = await prisma.activityLog.create({
                data: { projectId: project.id, actorId: owner.id, action: "TASK_UPDATED", createdAt: new Date("2026-03-01T00:00:00Z") },
            });
            const response = await request(app)
                .get(`${BASE}/activities`)
                .query({ startDate: "2026-02-01T00:00:00Z", endDate: "2026-04-01T00:00:00Z" })
                .set(createAuthHeader(owner));
            expect(response.status).toBe(200);
            expect(response.body.data.map((entry: { id: string }) => entry.id)).toEqual([withinRange.id]);
        });

        it("applies project filtering consistently to overdue tasks, workload and activities", async () => {
            const first = await createProject();
            const second = await createProject();
            const overdueDate = new Date(Date.now() - 86_400_000);
            const firstTask = await createTask(first.id, { dueDate: overdueDate, assigneeId: owner.id });
            await createTask(second.id, { dueDate: overdueDate, assigneeId: owner.id });
            const entry = await prisma.activityLog.create({
                data: { projectId: first.id, actorId: owner.id, action: "TASK_CREATED" },
            });
            await prisma.activityLog.create({
                data: { projectId: second.id, actorId: owner.id, action: "TASK_CREATED" },
            });

            const overdue = await request(app).get(`${BASE}/overdue-tasks`)
                .query({ projectId: first.id }).set(createAuthHeader(owner));
            const workload = await request(app).get(`${BASE}/workload`)
                .query({ projectId: first.id }).set(createAuthHeader(owner));
            const activities = await request(app).get(`${BASE}/activities`)
                .query({ projectId: first.id }).set(createAuthHeader(owner));

            expect(overdue.status).toBe(200);
            expect(overdue.body.data.map((item: { id: string }) => item.id)).toEqual([firstTask.id]);
            expect(workload.status).toBe(200);
            expect(workload.body.data[0].totalTasks).toBe(1);
            expect(activities.status).toBe(200);
            expect(activities.body.data.map((item: { id: string }) => item.id)).toEqual([entry.id]);
        });
    });
});
