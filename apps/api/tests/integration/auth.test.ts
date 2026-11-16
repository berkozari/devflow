import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import {
    prisma, trackUser, cleanupTestData,
} from "../helpers/test-database.js";
import { getCsrfToken, createCsrfHeader } from "../helpers/test-csrf.js";

const registerInput = () => ({
    name: "Auth Integration User",
    email: `auth-${crypto.randomUUID()}@test.com`,
    password: "TestPassword123!",
});

async function registerWithCsrf(
    agent: ReturnType<typeof request.agent>,
    csrfToken: string,
    input: ReturnType<typeof registerInput>,
) {
    const response = await agent
        .post("/api/v1/auth/register")
        .set(createCsrfHeader(csrfToken))
        .send(input);

    // Always register created users for cleanup before asserting on the response.
    if (typeof response.body?.data?.id === "string") {
        trackUser(response.body.data.id);
    }
    return response;
}

describe("Auth API Integration", () => {
    beforeAll(async () => { await prisma.$connect(); });
    afterEach(async () => { await cleanupTestData(); });
    afterAll(async () => {
        await cleanupTestData();
        await prisma.$disconnect();
    });

    it("registers a user without exposing the password hash", async () => {
        const agent = request.agent(app);
        const csrfToken = await getCsrfToken(agent);
        const input = registerInput();
        const response = await registerWithCsrf(agent, csrfToken, input);

        expect(response.status).toBe(201);
        expect(response.headers["cache-control"]).toContain("no-store");
        expect(response.body).toMatchObject({
            success: true,
            data: { name: input.name, email: input.email },
        });
        expect(response.body.data).not.toHaveProperty("passwordHash");
        expect(response.body.data).not.toHaveProperty("password");
    });

    it("rejects malformed registration data at the HTTP boundary", async () => {
        const agent = request.agent(app);
        const csrfToken = await getCsrfToken(agent);
        const response = await agent
            .post("/api/v1/auth/register")
            .set(createCsrfHeader(csrfToken))
            .send({ name: "A", email: "bad-email", password: "short" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it("allows a registered user to log in using a new access token", async () => {
        const agent = request.agent(app);
        const csrfToken = await getCsrfToken(agent);
        const input = registerInput();
        const registration = await registerWithCsrf(agent, csrfToken, input);
        expect(registration.status).toBe(201);

        const response = await agent
            .post("/api/v1/auth/login")
            .set(createCsrfHeader(csrfToken))
            .send({ email: input.email, password: input.password });

        expect(response.status).toBe(200);
        expect(response.headers["cache-control"]).toContain("no-store");
        expect(response.body).toMatchObject({
            success: true,
            data: { user: { email: input.email } },
        });
        expect(typeof response.body.data.accessToken).toBe("string");
        expect(response.body.data).not.toHaveProperty("refreshToken");
        expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("rejects refresh without a refresh cookie", async () => {
        const agent = request.agent(app);
        const csrfToken = await getCsrfToken(agent);
        const response = await agent
            .post("/api/v1/auth/refresh")
            .set(createCsrfHeader(csrfToken));

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
            success: false,
            message: "Refresh token is required",
        });
    });
});
