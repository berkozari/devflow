
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
    cleanupTestData,
} from "../helpers/test-database.js";

import { createAuthHeader } from "../helpers/test-auth.js";

interface TestUser {
    id: string;
    email: string;
    role: Role;
}

const BASE_URL = "/api/v1/notifications";

describe("Notification API", () => {
    let owner: TestUser;
    let outsider: TestUser;

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

    async function createNotification(
        userId: string,
        options: {
            type?: "TASK_ASSIGNED" | "TASK_MENTIONED" | "COMMENT_MENTIONED" | "COMMENT_CREATED";
            title?: string;
            read?: boolean;
        } = {},
    ) {
        return prisma.notification.create({
            data: {
                type: options.type ?? "TASK_ASSIGNED",
                title: options.title ?? "Test notification",
                message: "Test notification message",
                userId,
                readAt: options.read ? new Date() : null,
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

        outsider = await createUser(
            `outsider-${crypto.randomUUID()}@test.com`,
        );
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
                .get(BASE_URL);

            expect(response.status).toBe(401);
        });
    });

    // GET NOTIFICATIONS

    describe("GET /notifications", () => {
        it("should list user's notifications", async () => {
            await createNotification(owner.id);
            await createNotification(owner.id);

            const response = await request(app)
                .get(BASE_URL)
                .set(createAuthHeader(owner));

            console.log("OWNER:", owner);
            console.log("OWNER ID:", owner.id);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });

        it("should return an empty array when user has no notifications", async () => {
            const response = await request(app)
                .get(BASE_URL)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });

        it("should only return notifications belonging to the authenticated user", async () => {
            await createNotification(owner.id);
            await createNotification(outsider.id);

            const response = await request(app)
                .get(BASE_URL)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
        });

        it("should return pagination information", async () => {
            await createNotification(owner.id);
            await createNotification(owner.id);
            await createNotification(owner.id);

            const response = await request(app)
                .get(`${BASE_URL}?page=1&limit=2`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination).toMatchObject({
                page: 1,
                limit: 2,
                total: 3,
                totalPages: 2,
            });
        });

        it("should return only unread notifications when unreadOnly is true", async () => {
            await createNotification(owner.id, {
                read: true,
            });

            await createNotification(owner.id, {
                read: false,
            });

            const response = await request(app)
                .get(`${BASE_URL}?unreadOnly=true`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].readAt).toBeNull();
        });

        it("should reject an invalid page number", async () => {
            const response = await request(app)
                .get(`${BASE_URL}?page=0`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });

        it("should reject a limit greater than 100", async () => {
            const response = await request(app)
                .get(`${BASE_URL}?limit=101`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });
    });

    // GET UNREAD COUNT

    describe("GET /notifications/unread-count", () => {
        it("should return unread notification count", async () => {
            await createNotification(owner.id);
            await createNotification(owner.id);

            await createNotification(owner.id, {
                read: true,
            });

            const response = await request(app)
                .get(`${BASE_URL}/unread-count`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.count).toBe(2);
        });

        it("should return zero when there are no unread notifications", async () => {
            await createNotification(owner.id, {
                read: true,
            });

            const response = await request(app)
                .get(`${BASE_URL}/unread-count`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data.count).toBe(0);
        });

        it("should only count authenticated user's notifications", async () => {
            await createNotification(outsider.id);
            await createNotification(owner.id);

            const response = await request(app)
                .get(`${BASE_URL}/unread-count`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);
            expect(response.body.data.count).toBe(1);
        });
    });

    // MARK AS READ

    describe("PATCH /notifications/:notificationId/read", () => {
        it("should mark notification as read", async () => {
            const notification = await createNotification(owner.id);

            const response = await request(app)
                .patch(`${BASE_URL}/${notification.id}/read`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);

            const updated = await prisma.notification.findUnique({
                where: {
                    id: notification.id,
                },
            });

            expect(updated?.readAt).not.toBeNull();
        });

        it("should return 404 for a non-existing notification", async () => {
            const response = await request(app)
                .patch(
                    `${BASE_URL}/${crypto.randomUUID()}/read`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
        });

        it("should prevent users from marking another user's notification as read", async () => {
            const notification = await createNotification(outsider.id);

            const response = await request(app)
                .patch(`${BASE_URL}/${notification.id}/read`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);

            const unchanged = await prisma.notification.findUnique({
                where: {
                    id: notification.id,
                },
            });

            expect(unchanged?.readAt).toBeNull();
        });

        it("should reject an invalid notification ID", async () => {
            const response = await request(app)
                .patch(`${BASE_URL}/invalid-id/read`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });
    });

    // MARK ALL AS READ

    describe("PATCH /notifications/read-all", () => {
        it("should mark all user's notifications as read", async () => {
            await createNotification(owner.id);
            await createNotification(owner.id);
            await createNotification(owner.id);

            const response = await request(app)
                .patch(`${BASE_URL}/read-all`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);

            const unreadCount = await prisma.notification.count({
                where: {
                    userId: owner.id,
                    readAt: null,
                },
            });

            expect(unreadCount).toBe(0);
        });

        it("should not mark other users' notifications as read", async () => {
            await createNotification(owner.id);
            const outsiderNotification = await createNotification(outsider.id);

            const response = await request(app)
                .patch(`${BASE_URL}/read-all`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);

            const unchanged = await prisma.notification.findUnique({
                where: {
                    id: outsiderNotification.id,
                },
            });

            expect(unchanged?.readAt).toBeNull();
        });
    });

    // DELETE NOTIFICATION

    describe("DELETE /notifications/:notificationId", () => {
        it("should delete user's notification", async () => {
            const notification = await createNotification(owner.id);

            const response = await request(app)
                .delete(`${BASE_URL}/${notification.id}`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);

            const deleted = await prisma.notification.findUnique({
                where: {
                    id: notification.id,
                },
            });

            expect(deleted).toBeNull();
        });

        it("should return 404 for a non-existing notification", async () => {
            const response = await request(app)
                .delete(
                    `${BASE_URL}/${crypto.randomUUID()}`,
                )
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);
        });

        it("should prevent users from deleting another user's notification", async () => {
            const notification = await createNotification(outsider.id);

            const response = await request(app)
                .delete(`${BASE_URL}/${notification.id}`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(404);

            const existing = await prisma.notification.findUnique({
                where: {
                    id: notification.id,
                },
            });

            expect(existing).not.toBeNull();
        });

        it("should reject an invalid notification ID", async () => {
            const response = await request(app)
                .delete(`${BASE_URL}/invalid-id`)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(400);
        });
    });

    // DELETE ALL NOTIFICATIONS

    describe("DELETE /notifications", () => {
        it("should delete all user's notifications", async () => {
            await createNotification(owner.id);
            await createNotification(owner.id);
            await createNotification(owner.id);

            const response = await request(app)
                .delete(BASE_URL)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);

            const remaining = await prisma.notification.count({
                where: {
                    userId: owner.id,
                },
            });

            expect(remaining).toBe(0);
        });

        it("should not delete other users' notifications", async () => {
            await createNotification(owner.id);
            const outsiderNotification = await createNotification(outsider.id);

            const response = await request(app)
                .delete(BASE_URL)
                .set(createAuthHeader(owner));

            expect(response.status).toBe(200);

            const remaining = await prisma.notification.findUnique({
                where: {
                    id: outsiderNotification.id,
                },
            });

            expect(remaining).not.toBeNull();
        });
    });
});