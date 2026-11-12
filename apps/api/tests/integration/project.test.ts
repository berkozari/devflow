
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../../src/app.js";

import {
    prisma,
    trackUser,
    trackProject,
    cleanupTestData,
} from "../helpers/test-database.js";

import {
    createAuthHeader,
} from "../helpers/test-auth.js";

import type { Role } from "../../src/generated/prisma/client.js";

interface TestUser {
    id: string;
    name: string;
    email: string;
    role: Role;
}

async function createTestUser(
    role: Role = "USER",
): Promise<TestUser> {
    const user = await prisma.user.create({
        data: {
            name: "Project Test User",
            email: `project-test-${crypto.randomUUID()}@example.com`,
            passwordHash: "test-password-hash",
            role,
        },
    });

    trackUser(user.id);

    return user;
}

async function createTestProject(ownerId: string) {
    const project = await prisma.project.create({
        data: {
            name: `Test Project ${crypto.randomUUID()}`,
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

describe("Project API", () => {
    let owner: TestUser;
    let outsider: TestUser;

    beforeAll(async () => {
        await prisma.$connect();
    });

    beforeEach(async () => {
        owner = await createTestUser();
        outsider = await createTestUser();
    });

    afterAll(async () => {
        await cleanupTestData();
        await prisma.$disconnect();
    });

    describe("POST /projects", () => {
        it("should return 401 without an access token", async () => {
            const response = await request(app)
                .post("/api/v1/projects")
                .send({
                    name: "New Project",
                });

            expect(response.status).toBe(401);
        });

        it("should create a project successfully", async () => {
            const response = await request(app)
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .send({
                    name: "New Project",
                    description: "Project description",
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe("New Project");

            trackProject(response.body.data.id);
        });

        it("should automatically add the creator as OWNER", async () => {
            const response = await request(app)
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .send({
                    name: "Owner Project",
                });

            expect(response.status).toBe(201);

            trackProject(response.body.data.id);

            const membership = await prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId: response.body.data.id,
                        userId: owner.id,
                    },
                },
            });

            expect(membership).not.toBeNull();
            expect(membership?.role).toBe("OWNER");
        });

        it("should reject a project name shorter than 3 characters", async () => {
            const response = await request(app)
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .send({
                    name: "AB",
                });

            expect(response.status).toBe(400);
        });

        it("should reject a project name longer than 100 characters", async () => {
            const response = await request(app)
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .send({
                    name: "A".repeat(101),
                });

            expect(response.status).toBe(400);
        });

        it("should reject an empty project name", async () => {
            const response = await request(app)
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .send({
                    name: "",
                });

            expect(response.status).toBe(400);
        });
    });

    describe("GET /projects", () => {
        it("should return 401 without an access token", async () => {
            const response = await request(app)
                .get("/api/v1/projects");

            expect(response.status).toBe(401);
        });

        it("should return projects belonging to the authenticated user", async () => {
            await createTestProject(owner.id);

            const response = await request(app)
                .get("/api/v1/projects")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        });

        it("should not return another user's projects", async () => {
            await createTestProject(owner.id);
            await createTestProject(outsider.id);

            const response = await request(app)
                .get("/api/v1/projects")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);

            const projectIds = response.body.data.map(
                (project: { ownerId?: string }) => project.ownerId,
            );

            expect(projectIds).not.toContain(outsider.id);
        });

        it("should return pagination information", async () => {
            const response = await request(app)
                .get("/api/v1/projects?page=1&limit=5")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.pagination).toMatchObject({
                page: 1,
                limit: 5,
            });
        });

        it("should reject an invalid page number", async () => {
            const response = await request(app)
                .get("/api/v1/projects?page=0")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });

        it("should reject a limit greater than 50", async () => {
            const response = await request(app)
                .get("/api/v1/projects?limit=100")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });

        it("should filter projects by status", async () => {
            const response = await request(app)
                .get("/api/v1/projects?status=ACTIVE")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);

            expect(
                response.body.data.every(
                    (project: { status: string }) =>
                        project.status === "ACTIVE",
                ),
            ).toBe(true);
        });
    });

    describe("GET /projects/:id", () => {
        it("should return 401 without an access token", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${crypto.randomUUID()}`);

            expect(response.status).toBe(401);
        });

        it("should return a project by ID", async () => {
            const project = await createTestProject(owner.id);

            const response = await request(app)
                .get(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(project.id);
        });

        it("should return 404 for another user's project", async () => {
            const project = await createTestProject(owner.id);

            const response = await request(app)
                .get(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
        });

        it("should reject an invalid project ID", async () => {
            const response = await request(app)
                .get("/api/v1/projects/invalid-id")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });
    });

    describe("PATCH /projects/:id", () => {
        it("should return 401 without an access token", async () => {
            const response = await request(app)
                .patch(`/api/v1/projects/${crypto.randomUUID()}`)
                .send({
                    name: "Updated Project",
                });

            expect(response.status).toBe(401);
        });

        it("should update a project successfully", async () => {
            const project = await createTestProject(owner.id);

            const response = await request(app)
                .patch(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner))
                .send({
                    name: "Updated Project",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.name).toBe("Updated Project");
        });

        it("should update project status", async () => {
            const project = await createTestProject(owner.id);

            const response = await request(app)
                .patch(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner))
                .send({
                    status: "ACTIVE",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe("ACTIVE");
        });

        it("should reject an empty update body", async () => {
            const project = await createTestProject(owner.id);

            const response = await request(app)
                .patch(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner))
                .send({});

            expect(response.status).toBe(400);
        });

        it("should reject updates from another user", async () => {
            const project = await createTestProject(owner.id);

            const response = await request(app)
                .patch(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(outsider))
                .send({
                    name: "Unauthorized Update",
                });

            expect(response.status).toBe(404);
        });

        it("should reject an invalid project ID", async () => {
            const response = await request(app)
                .patch("/api/v1/projects/invalid-id")
                .set(createAuthHeader(owner))
                .send({
                    name: "Updated Project",
                });

            expect(response.status).toBe(400);
        });
    });

    describe("DELETE /projects/:id", () => {
        it("should return 401 without an access token", async () => {
            const response = await request(app)
                .delete(`/api/v1/projects/${crypto.randomUUID()}`);

            expect(response.status).toBe(401);
        });

        it("should delete a project successfully", async () => {
            const project = await createTestProject(owner.id);

            const response = await request(app)
                .delete(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const deletedProject = await prisma.project.findUnique({
                where: { id: project.id },
            });

            expect(deletedProject).toBeNull();

            trackProject(project.id);
        });

        it("should reject deletion by another user", async () => {
            const project = await createTestProject(owner.id);

            const response = await request(app)
                .delete(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
        });

        it("should reject an invalid project ID", async () => {
            const response = await request(app)
                .delete("/api/v1/projects/invalid-id")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });
    });
});
