
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import express from "express";
import request from "supertest";

vi.mock("../../../src/routes/auth.routes.js", () => ({
    default: express.Router().get("/test", (_req, res) => {
        res.json({ route: "auth" });
    }),
}));

vi.mock("../../../src/routes/user.routes.js", () => ({
    default: express.Router().get("/test", (_req, res) => {
        res.json({ route: "users" });
    }),
}));

vi.mock("../../../src/routes/admin.routes.js", () => ({
    default: express.Router().get("/test", (_req, res) => {
        res.json({ route: "admin" });
    }),
}));

vi.mock("../../../src/routes/project.routes.js", () => ({
    default: express.Router().get("/test", (_req, res) => {
        res.json({ route: "projects" });
    }),
}));

vi.mock("../../../src/routes/project-member.routes.js", () => ({
    default: express.Router().get("/members-test", (_req, res) => {
        res.json({ route: "project-members" });
    }),
}));

import router from "../../../src/routes/index.js";

describe("API Routes Index", () => {
    let app: express.Express;

    beforeEach(() => {
        app = express();
        app.use("/", router);
    });

    it("should return API information", async () => {
        const response = await request(app).get("/");

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            success: true,
            message: "DevFlow API v1",
        });
    });

    it("should register auth routes", async () => {
        const response = await request(app).get("/auth/test");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ route: "auth" });
    });

    it("should register user routes", async () => {
        const response = await request(app).get("/users/test");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ route: "users" });
    });

    it("should register admin routes", async () => {
        const response = await request(app).get("/admin/test");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ route: "admin" });
    });

    it("should register project routes", async () => {
        const response = await request(app).get("/projects/test");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ route: "projects" });
    });

    it("should register project member routes", async () => {
        const response = await request(app)
            .get("/projects/members-test");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            route: "project-members",
        });
    });
});
