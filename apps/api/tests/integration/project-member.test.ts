
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

describe("Project Member API", () => {
    let owner: TestUser;
    let admin: TestUser;
    let member: TestUser;
    let target: TestUser;
    let projectId: string;

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

        target = await createUser(
            `target-${crypto.randomUUID()}@test.com`,
        );

        const project = await prisma.project.create({
            data: {
                name: "Test Project",
                ownerId: owner.id,
            },
            select: {
                id: true,
            },
        });

        projectId = project.id;
        trackProject(projectId);

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
                .get(`/api/v1/projects/${projectId}/members`);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // GET MEMBERS

    describe("GET /projects/:projectId/members", () => {
        it("should allow OWNER to list project members", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });

        it("should allow MEMBER to list project members", async () => {
            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(member));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should return 404 to a user outside the project", async () => {
            const outsider = await createUser(
                `outsider-${crypto.randomUUID()}@test.com`,
            );

            const response = await request(app)
                .get(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(outsider));

            expect(response.status).toBe(404);
        });

        it("should reject an invalid project ID", async () => {
            const response = await request(app)
                .get("/api/v1/projects/invalid-id/members")
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });

        it("should return 404 for a non-existing project", async () => {
            const response = await request(app)
                .get(
                    "/api/v1/projects/00000000-0000-4000-8000-000000000001/members",
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
        });
    });

    // ADD MEMBER

    describe("POST /projects/:projectId/members", () => {
        it("should allow OWNER to add a member", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(owner))
                .send({
                    email: target.email,
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.role).toBe("MEMBER");
        });

        it("should allow ADMIN to add a MEMBER", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(admin))
                .send({
                    email: target.email,
                    role: "MEMBER",
                });

            expect(response.status).toBe(201);
            expect(response.body.data.role).toBe("MEMBER");
        });

        it("should prevent ADMIN from adding another ADMIN", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(admin))
                .send({
                    email: target.email,
                    role: "ADMIN",
                });

            expect(response.status).toBe(403);
        });

        it("should prevent MEMBER from adding another member", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(member))
                .send({
                    email: target.email,
                });

            expect(response.status).toBe(403);
        });

        it("should return 409 when adding an existing member", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(owner))
                .send({
                    email: member.email,
                });

            expect(response.status).toBe(409);
        });

        it("should reject OWNER as an assignable membership role", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(owner))
                .send({
                    email: target.email,
                    role: "OWNER",
                });

            expect(response.status).toBe(400);
        });

        it("should reject an invalid email", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(owner))
                .send({
                    email: "invalid-email",
                });

            expect(response.status).toBe(400);
        });

        it("should reject an empty email", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(owner))
                .send({
                    email: "",
                });

            expect(response.status).toBe(400);
        });

        it("should return 404 when the user does not exist", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(owner))
                .send({
                    email: `nonexistent-${crypto.randomUUID()}@test.com`,
                });

            expect(response.status).toBe(404);
        });

        it("should reject an invalid project role", async () => {
            const response = await request(app)
                .post(`/api/v1/projects/${projectId}/members`)
                .set(createAuthHeader(owner))
                .send({
                    email: target.email,
                    role: "SUPER_ADMIN",
                });

            expect(response.status).toBe(400);
        });
    });

    // UPDATE MEMBER ROLE

    describe("PATCH /projects/:projectId/members/:userId", () => {
        it("should allow OWNER to update a member role", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/members/${member.id}`,
                )
                .set(createAuthHeader(owner))
                .send({
                    role: "ADMIN",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.role).toBe("ADMIN");
        });

        it("should prevent ADMIN from changing member roles", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/members/${member.id}`,
                )
                .set(createAuthHeader(admin))
                .send({
                    role: "ADMIN",
                });

            expect(response.status).toBe(403);
        });

        it("should prevent changing the OWNER role", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/members/${owner.id}`,
                )
                .set(createAuthHeader(owner))
                .send({
                    role: "ADMIN",
                });

            expect(response.status).toBe(403);
        });

        it("should reject an invalid user ID", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/members/invalid-id`,
                )
                .set(createAuthHeader(owner))
                .send({
                    role: "ADMIN",
                });

            expect(response.status).toBe(400);
        });

        it("should reject a missing role", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/members/${member.id}`,
                )
                .set(createAuthHeader(owner))
                .send({});

            expect(response.status).toBe(400);
        });

        it("should reject OWNER as an update role", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/members/${member.id}`,
                )
                .set(createAuthHeader(owner))
                .send({
                    role: "OWNER",
                });

            expect(response.status).toBe(400);
        });

        it("should return 404 when updating a non-existing member", async () => {
            const response = await request(app)
                .patch(
                    `/api/v1/projects/${projectId}/members/${target.id}`,
                )
                .set(createAuthHeader(owner))
                .send({
                    role: "ADMIN",
                });

            expect(response.status).toBe(404);
        });
    });

    // REMOVE MEMBER

    describe("DELETE /projects/:projectId/members/:userId", () => {
        it("should allow OWNER to remove a member", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/members/${member.id}`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const membership = await prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId,
                        userId: member.id,
                    },
                },
            });

            expect(membership).toBeNull();
        });

        it("should prevent ADMIN from removing another ADMIN", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/members/${admin.id}`,
                )
                .set(createAuthHeader(admin));

            expect(response.status).toBe(403);
        });

        it("should prevent removing the project OWNER", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/members/${owner.id}`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(403);
        });

        it("should reject an invalid user ID", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/members/invalid-id`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });

        it("should return 404 when removing a non-existing member", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/projects/${projectId}/members/${target.id}`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
        });
    });
});
