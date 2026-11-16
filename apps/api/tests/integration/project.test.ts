import {
    beforeAll,
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

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

import {
    getCsrfToken,
    createCsrfHeader,
} from "../helpers/test-csrf.js";

import type { Role } from "../../src/generated/prisma/client.js";
import type { SuperAgentTest } from "supertest";

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

    let agent: SuperAgentTest;
    let csrfToken: string;

    beforeAll(async () => {
        await prisma.$connect();
    });

    beforeEach(async () => {
        agent = request.agent(app);

        csrfToken = await getCsrfToken(agent);

        owner = await createTestUser();
        outsider = await createTestUser();
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

    describe("POST /projects", () => {
        it("should reject project creation without a CSRF token", async () => {
            // agent has the CSRF session cookie; intentionally omit X-CSRF-Token.
            const response = await agent
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .send({
                    name: "Project Without CSRF",
                });

            expect(response.status).toBe(403);
        });

        it("should return 401 without an access token", async () => {
            const response = await agent
                .post("/api/v1/projects")
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "New Project",
                });

            expect(response.status).toBe(401);
        });

        it("should create a project successfully", async () => {
            const response = await agent
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "New Project",
                    description: "Project description",
                });

            // Track the created row even if an assertion below fails.
            if (typeof response.body?.data?.id === "string") {
                trackProject(response.body.data.id);
            }

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe("New Project");
        });

        it("should automatically add the creator as OWNER", async () => {
            const response = await agent
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "Owner Project",
                });

            // Ensure cleanup also works if a later assertion fails.
            if (typeof response.body?.data?.id === "string") {
                trackProject(response.body.data.id);
            }

            expect(response.status).toBe(201);

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
            const response = await agent
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "AB",
                });

            expect(response.status).toBe(400);
        });

        it("should reject a project name longer than 100 characters", async () => {
            const response = await agent
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "A".repeat(101),
                });

            expect(response.status).toBe(400);
        });

        it("should reject an empty project name", async () => {
            const response = await agent
                .post("/api/v1/projects")
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "",
                });

            expect(response.status).toBe(400);
        });
    });

    describe("GET /projects", () => {
        it("should return 401 without an access token", async () => {
            const response = await agent
                .get("/api/v1/projects");

            expect(response.status).toBe(401);
        });

        it("should return projects belonging to the authenticated user", async () => {
            await createTestProject(owner.id);

            const response = await agent
                .get("/api/v1/projects")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        });

        it("should not return another user's projects", async () => {
            const ownProject = await createTestProject(owner.id);
            const outsiderProject = await createTestProject(outsider.id);

            const response = await agent
                .get("/api/v1/projects")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            const projectIds = response.body.data.map(
                (project: { id: string }) => project.id,
            );

            expect(projectIds).toContain(ownProject.id);
            expect(projectIds).not.toContain(outsiderProject.id);
        });

        it("should return pagination information", async () => {
            const response = await agent
                .get("/api/v1/projects?page=1&limit=5")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.pagination).toMatchObject({
                page: 1,
                limit: 5,
            });
        });

        it("should reject an invalid page number", async () => {
            const response = await agent
                .get("/api/v1/projects?page=0")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });

        it("should reject a limit greater than 50", async () => {
            const response = await agent
                .get("/api/v1/projects?limit=100")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });

        it("should filter projects by status", async () => {
            const activeProject = await createTestProject(owner.id);
            const planningProject = await createTestProject(owner.id);

            await prisma.project.update({
                where: { id: activeProject.id },
                data: { status: "ACTIVE" },
            });

            const response = await agent
                .get("/api/v1/projects?status=ACTIVE")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            const projectIds = response.body.data.map(
                (project: { id: string }) => project.id,
            );

            expect(projectIds).toContain(activeProject.id);
            expect(projectIds).not.toContain(planningProject.id);

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
            const response = await agent
                .get(`/api/v1/projects/${crypto.randomUUID()}`);

            expect(response.status).toBe(401);
        });

        it("should return a project by ID", async () => {
            const project = await createTestProject(owner.id);

            const response = await agent
                .get(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(project.id);
        });

        it("should return 404 for another user's project", async () => {
            const project = await createTestProject(owner.id);

            const response = await agent
                .get(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
        });

        it("should reject an invalid project ID", async () => {
            const response = await agent
                .get("/api/v1/projects/invalid-id")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });
    });

    describe("PATCH /projects/:id", () => {
        it("should return 401 without an access token", async () => {
            const response = await agent
                .patch(`/api/v1/projects/${crypto.randomUUID()}`)
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "Updated Project",
                });

            expect(response.status).toBe(401);
        });

        it("should update a project successfully", async () => {
            const project = await createTestProject(owner.id);

            const response = await agent
                .patch(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "Updated Project",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.name).toBe("Updated Project");
        });

        it("should update project status", async () => {
            const project = await createTestProject(owner.id);

            const response = await agent
                .patch(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken))
                .send({
                    status: "ACTIVE",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe("ACTIVE");
        });

        it("should reject an empty update body", async () => {
            const project = await createTestProject(owner.id);

            const response = await agent
                .patch(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken))
                .send({});

            expect(response.status).toBe(400);
        });

        it("should reject updates from another user", async () => {
            const project = await createTestProject(owner.id);

            const response = await agent
                .patch(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(outsider))
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "Unauthorized Update",
                });

            expect(response.status).toBe(404);
        });

        it("should reject an invalid project ID", async () => {
            const response = await agent
                .patch("/api/v1/projects/invalid-id")
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken))
                .send({
                    name: "Updated Project",
                });

            expect(response.status).toBe(400);
        });
    });

    describe("DELETE /projects/:id", () => {
        it("should return 401 without an access token", async () => {
            const response = await agent
                .delete(`/api/v1/projects/${crypto.randomUUID()}`)
                .set(createCsrfHeader(csrfToken));

            expect(response.status).toBe(401);
        });

        it("should delete a project successfully", async () => {
            const project = await createTestProject(owner.id);

            const response = await agent
                .delete(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const deletedProject = await prisma.project.findUnique({
                where: {
                    id: project.id,
                },
            });

            expect(deletedProject).toBeNull();
        });

        it("should reject deletion by another user", async () => {
            const project = await createTestProject(owner.id);

            const response = await agent
                .delete(`/api/v1/projects/${project.id}`)
                .set(createAuthHeader(outsider))
                .set(createCsrfHeader(csrfToken));

            expect(response.status).toBe(404);
        });

        it("should reject an invalid project ID", async () => {
            const response = await agent
                .delete("/api/v1/projects/invalid-id")
                .set(createAuthHeader(owner))
                .set(createCsrfHeader(csrfToken));

            expect(response.status).toBe(400);
        });
    });
});
