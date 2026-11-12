
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type { Request, Response } from "express";

const {
    create,
    findMany,
    findById,
    update,
    deleteProject,
} = vi.hoisted(() => ({
    create: vi.fn(),
    findMany: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    deleteProject: vi.fn(),
}));

vi.mock("../../../src/services/project.service.js", () => ({
    projectService: {
        create,
        findMany,
        findById,
        update,
        delete: deleteProject,
    },
}));

import * as projectController from "../../../src/controllers/project.controller.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

const PROJECT = {
    id: PROJECT_ID,
    name: "Test Project",
    description: "Test description",
    status: "PLANNING",
};

function createMocks() {
    const req = {
        body: {},
        params: {},
        query: {},
        user: {
            id: USER_ID,
            email: "test@example.com",
            role: "USER",
        },
    } as unknown as Request;

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn();

    return { req, res, next };
}

describe("Project Controller", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createProject", () => {
        it("should create a project successfully", async () => {
            const { req, res, next } = createMocks();

            req.body = {
                name: "Test Project",
                description: "Test description",
            };

            create.mockResolvedValue(PROJECT);

            await projectController.createProject(req, res, next);

            expect(create).toHaveBeenCalledWith(USER_ID, {
                name: "Test Project",
                description: "Test description",
            });

            expect(res.status).toHaveBeenCalledWith(201);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Project created successfully",
                data: PROJECT,
            });

            expect(next).not.toHaveBeenCalled();
        });

        it("should return 401 when user is missing", async () => {
            const { req, res, next } = createMocks();

            req.user = undefined;

            await projectController.createProject(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Authentication required",
            });

            expect(create).not.toHaveBeenCalled();
        });

        it("should pass validation error to next", async () => {
            const { req, res, next } = createMocks();

            req.body = {
                name: "A",
            };

            await projectController.createProject(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ZodError",
                }),
            );

            expect(create).not.toHaveBeenCalled();
        });

        it("should convert PROJECT_NOT_FOUND into AppError 404", async () => {
            const { req, res, next } = createMocks();

            req.body = {
                name: "Test Project",
            };

            create.mockRejectedValue(
                new Error("PROJECT_NOT_FOUND"),
            );

            await projectController.createProject(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Project not found",
                    statusCode: 404,
                }),
            );
        });

        it("should pass unexpected errors to next", async () => {
            const { req, res, next } = createMocks();

            req.body = {
                name: "Test Project",
            };

            const error = new Error("Unexpected error");

            create.mockRejectedValue(error);

            await projectController.createProject(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe("getProjects", () => {
        it("should get projects successfully", async () => {
            const { req, res, next } = createMocks();

            const result = {
                projects: [PROJECT],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            };

            findMany.mockResolvedValue(result);

            await projectController.getProjects(req, res, next);

            expect(findMany).toHaveBeenCalledWith(USER_ID, {
                page: 1,
                limit: 10,
            });

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result.projects,
                pagination: result.pagination,
            });
        });

        it("should return 401 when user is missing", async () => {
            const { req, res, next } = createMocks();

            req.user = undefined;

            await projectController.getProjects(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(findMany).not.toHaveBeenCalled();
        });

        it("should pass query validation error to next", async () => {
            const { req, res, next } = createMocks();

            req.query = {
                page: "-1",
            };

            await projectController.getProjects(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ZodError",
                }),
            );

            expect(findMany).not.toHaveBeenCalled();
        });

        it("should pass service errors to next", async () => {
            const { req, res, next } = createMocks();

            const error = new Error("Database error");

            findMany.mockRejectedValue(error);

            await projectController.getProjects(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });

        it("should convert PROJECT_NOT_FOUND into AppError 404", async () => {
            const { req, res, next } = createMocks();

            findMany.mockRejectedValue(
                new Error("PROJECT_NOT_FOUND"),
            );

            await projectController.getProjects(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Project not found",
                    statusCode: 404,
                }),
            );
        });
    });

    describe("getProjectById", () => {
        it("should get project by ID successfully", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            findById.mockResolvedValue(PROJECT);

            await projectController.getProjectById(req, res, next);

            expect(findById).toHaveBeenCalledWith(
                PROJECT_ID,
                USER_ID,
            );

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: PROJECT,
            });
        });

        it("should return 401 when user is missing", async () => {
            const { req, res, next } = createMocks();

            req.user = undefined;

            await projectController.getProjectById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(findById).not.toHaveBeenCalled();
        });

        it("should pass invalid UUID error to next", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: "invalid-id",
            };

            await projectController.getProjectById(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ZodError",
                }),
            );

            expect(findById).not.toHaveBeenCalled();
        });

        it("should convert PROJECT_NOT_FOUND into AppError 404", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            findById.mockRejectedValue(
                new Error("PROJECT_NOT_FOUND"),
            );

            await projectController.getProjectById(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Project not found",
                    statusCode: 404,
                }),
            );
        });

        it("should pass unexpected errors to next", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            const error = new Error("Unexpected error");

            findById.mockRejectedValue(error);

            await projectController.getProjectById(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe("updateProject", () => {
        it("should update project successfully", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            req.body = {
                name: "Updated Project",
            };

            const updatedProject = {
                ...PROJECT,
                name: "Updated Project",
            };

            update.mockResolvedValue(updatedProject);

            await projectController.updateProject(req, res, next);

            expect(update).toHaveBeenCalledWith(
                PROJECT_ID,
                USER_ID,
                {
                    name: "Updated Project",
                },
            );

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Project updated successfully",
                data: updatedProject,
            });
        });

        it("should return 401 when user is missing", async () => {
            const { req, res, next } = createMocks();

            req.user = undefined;

            await projectController.updateProject(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(update).not.toHaveBeenCalled();
        });

        it("should pass invalid UUID error to next", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: "invalid-id",
            };

            req.body = {
                name: "Updated Project",
            };

            await projectController.updateProject(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ZodError",
                }),
            );

            expect(update).not.toHaveBeenCalled();
        });

        it("should pass invalid body error to next", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            req.body = {};

            await projectController.updateProject(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ZodError",
                }),
            );

            expect(update).not.toHaveBeenCalled();
        });

        it("should convert PROJECT_NOT_FOUND into AppError 404", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            req.body = {
                name: "Updated Project",
            };

            update.mockRejectedValue(
                new Error("PROJECT_NOT_FOUND"),
            );

            await projectController.updateProject(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Project not found",
                    statusCode: 404,
                }),
            );
        });

        it("should pass unexpected errors to next", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            req.body = {
                name: "Updated Project",
            };

            const error = new Error("Unexpected error");

            update.mockRejectedValue(error);

            await projectController.updateProject(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe("deleteProject", () => {
        it("should delete project successfully", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            deleteProject.mockResolvedValue(undefined);

            await projectController.deleteProject(req, res, next);

            expect(deleteProject).toHaveBeenCalledWith(
                PROJECT_ID,
                USER_ID,
            );

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Project deleted successfully",
            });
        });

        it("should return 401 when user is missing", async () => {
            const { req, res, next } = createMocks();

            req.user = undefined;

            await projectController.deleteProject(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(deleteProject).not.toHaveBeenCalled();
        });

        it("should pass invalid UUID error to next", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: "invalid-id",
            };

            await projectController.deleteProject(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ZodError",
                }),
            );

            expect(deleteProject).not.toHaveBeenCalled();
        });

        it("should convert PROJECT_NOT_FOUND into AppError 404", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            deleteProject.mockRejectedValue(
                new Error("PROJECT_NOT_FOUND"),
            );

            await projectController.deleteProject(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Project not found",
                    statusCode: 404,
                }),
            );
        });

        it("should pass unexpected errors to next", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            const error = new Error("Unexpected error");

            deleteProject.mockRejectedValue(error);

            await projectController.deleteProject(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });

        it("should pass non-Error values to next", async () => {
            const { req, res, next } = createMocks();

            req.params = {
                id: PROJECT_ID,
            };

            deleteProject.mockRejectedValue("Unknown failure");

            await projectController.deleteProject(req, res, next);

            expect(next).toHaveBeenCalledWith("Unknown failure");
        });
    });
});
