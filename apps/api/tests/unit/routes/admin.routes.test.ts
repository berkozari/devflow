
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import express from "express";
import request from "supertest";

const { authenticateMock, authorizeMock } = vi.hoisted(() => ({
    authenticateMock: vi.fn(),
    authorizeMock: vi.fn(),
}));

vi.mock("../../../src/middlewares/auth.middleware.js", () => ({
    authenticate: (req: any, res: any, next: any) =>
        authenticateMock(req, res, next),
}));

vi.mock("../../../src/middlewares/authorize.middleware.js", () => ({
    authorize: (role: string) => {
        return (req: any, res: any, next: any) =>
            authorizeMock(role, req, res, next);
    },
}));

import adminRouter from "../../../src/routes/admin.routes.js";

describe("Admin Routes", () => {
    let app: express.Express;

    beforeEach(() => {
        vi.clearAllMocks();

        app = express();

        authenticateMock.mockImplementation(
            (_req, _res, next) => next(),
        );

        authorizeMock.mockImplementation(
            (_role, _req, _res, next) => next(),
        );

        app.use("/admin", adminRouter);
    });

    it("should return admin dashboard successfully", async () => {
        const response = await request(app)
            .get("/admin/dashboard");

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            success: true,
            message: "Welcome to the admin dashboard",
        });
    });

    it("should call authenticate middleware", async () => {
        await request(app).get("/admin/dashboard");

        expect(authenticateMock).toHaveBeenCalled();
    });

    it("should require ADMIN authorization", async () => {
        await request(app).get("/admin/dashboard");

        expect(authorizeMock).toHaveBeenCalledWith(
            "ADMIN",
            expect.anything(),
            expect.anything(),
            expect.any(Function),
        );
    });

    it("should reject unauthenticated requests", async () => {
        authenticateMock.mockImplementation(
            (_req, res, _next) => {
                res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            },
        );

        const response = await request(app)
            .get("/admin/dashboard");

        expect(response.status).toBe(401);
    });

    it("should reject unauthorized users", async () => {
        authorizeMock.mockImplementation(
            (_role, _req, res, _next) => {
                res.status(403).json({
                    success: false,
                    message: "Forbidden",
                });
            },
        );

        const response = await request(app)
            .get("/admin/dashboard");

        expect(response.status).toBe(403);
    });
});
