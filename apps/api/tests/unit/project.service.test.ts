
import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectRepository } from "../../src/repositories/project.repository.js";
import { projectService } from "../../src/services/project.service.js";
import { AppError } from "../../src/utils/app-error.js";

import type {
    CreateProjectInput,
    UpdateProjectInput,
    ProjectQueryInput,
} from "../../src/schemas/project.schema.js";

vi.mock("../../src/repositories/project.repository.js", () => ({
    projectRepository: {
        create: vi.fn(),
        findMany: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

const mockedRepository = vi.mocked(projectRepository);

const OWNER_ID = "owner-uuid";
const ADMIN_ID = "admin-uuid";
const MEMBER_ID = "member-uuid";
const PROJECT_ID = "project-uuid";

const mockProject = {
    id: PROJECT_ID,
    name: "DevFlow",
    description: "Project management application",
    status: "ACTIVE",
    ownerId: OWNER_ID,
    members: [
        {
            userId: ADMIN_ID,
            role: "ADMIN",
        },
        {
            userId: MEMBER_ID,
            role: "MEMBER",
        },
    ],
};

const createProjectData: CreateProjectInput = {
    name: "DevFlow",
    description: "Project management application",
};

const updateProjectData: UpdateProjectInput = {
    name: "Updated DevFlow",
};

const query: ProjectQueryInput = {
    page: 1,
    limit: 10,
};

describe("Project Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("create", () => {
        it("should create a project", async () => {
            mockedRepository.create.mockResolvedValue(
                mockProject as never,
            );

            const result = await projectService.create(
                OWNER_ID,
                createProjectData,
            );

            expect(result).toEqual(mockProject);

            expect(mockedRepository.create).toHaveBeenCalledWith(
                OWNER_ID,
                createProjectData,
            );
        });
    });

    describe("findMany", () => {
        it("should return paginated projects", async () => {
            const response = {
                projects: [mockProject],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            };

            mockedRepository.findMany.mockResolvedValue(
                response as never,
            );

            const result = await projectService.findMany(
                OWNER_ID,
                query,
            );

            expect(result).toEqual(response);

            expect(mockedRepository.findMany).toHaveBeenCalledWith(
                OWNER_ID,
                query,
            );
        });
    });

    describe("findById", () => {
        it("should return project details for an owner", async () => {
            mockedRepository.findById.mockResolvedValue(
                mockProject as never,
            );

            const result = await projectService.findById(
                PROJECT_ID,
                OWNER_ID,
            );

            expect(result).toEqual(mockProject);
        });

        it("should return project details for an admin", async () => {
            mockedRepository.findById.mockResolvedValue(
                mockProject as never,
            );

            const result = await projectService.findById(
                PROJECT_ID,
                ADMIN_ID,
            );

            expect(result).toEqual(mockProject);
        });

        it("should return project details for a member", async () => {
            mockedRepository.findById.mockResolvedValue(
                mockProject as never,
            );

            const result = await projectService.findById(
                PROJECT_ID,
                MEMBER_ID,
            );

            expect(result).toEqual(mockProject);
        });

        it("should throw 404 when project does not exist", async () => {
            mockedRepository.findById.mockResolvedValue(null as never);

            await expect(
                projectService.findById(PROJECT_ID, OWNER_ID),
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Project not found",
            });
        });
    });

    describe("update", () => {
        beforeEach(() => {
            mockedRepository.findById.mockResolvedValue(
                mockProject as never,
            );

            mockedRepository.update.mockResolvedValue({
                count: 1,
            } as never);
        });

        it("should allow OWNER to update project", async () => {
            const updatedProject = {
                ...mockProject,
                name: "Updated DevFlow",
            };

            mockedRepository.findById
                .mockResolvedValueOnce(mockProject as never)
                .mockResolvedValueOnce(updatedProject as never);

            const result = await projectService.update(
                PROJECT_ID,
                OWNER_ID,
                updateProjectData,
            );

            expect(result).toEqual(updatedProject);

            expect(mockedRepository.update).toHaveBeenCalledWith(
                PROJECT_ID,
                OWNER_ID,
                updateProjectData,
            );
        });

        it("should allow ADMIN to update project", async () => {
            const updatedProject = {
                ...mockProject,
                name: "Updated DevFlow",
            };

            mockedRepository.findById
                .mockResolvedValueOnce(mockProject as never)
                .mockResolvedValueOnce(updatedProject as never);

            const result = await projectService.update(
                PROJECT_ID,
                ADMIN_ID,
                updateProjectData,
            );

            expect(result).toEqual(updatedProject);
        });

        it("should prevent MEMBER from updating project", async () => {
            await expect(
                projectService.update(
                    PROJECT_ID,
                    MEMBER_ID,
                    updateProjectData,
                ),
            ).rejects.toBeInstanceOf(AppError);

            expect(mockedRepository.update).not.toHaveBeenCalled();
        });

        it("should throw 404 when project does not exist", async () => {
            mockedRepository.findById.mockResolvedValue(null as never);

            await expect(
                projectService.update(
                    PROJECT_ID,
                    OWNER_ID,
                    updateProjectData,
                ),
            ).rejects.toMatchObject({
                statusCode: 404,
            });

            expect(mockedRepository.update).not.toHaveBeenCalled();
        });

        it("should throw 404 when update affects no records", async () => {
            mockedRepository.update.mockResolvedValue({
                count: 0,
            } as never);

            await expect(
                projectService.update(
                    PROJECT_ID,
                    OWNER_ID,
                    updateProjectData,
                ),
            ).rejects.toMatchObject({
                statusCode: 404,
            });
        });
    });

    describe("delete", () => {
        beforeEach(() => {
            mockedRepository.findById.mockResolvedValue(
                mockProject as never,
            );

            mockedRepository.delete.mockResolvedValue({
                count: 1,
            } as never);
        });

        it("should allow OWNER to delete project", async () => {
            const result = await projectService.delete(
                PROJECT_ID,
                OWNER_ID,
            );

            expect(result).toEqual({
                success: true,
            });

            expect(mockedRepository.delete).toHaveBeenCalledWith(
                PROJECT_ID,
                OWNER_ID,
            );
        });

        it("should prevent ADMIN from deleting project", async () => {
            await expect(
                projectService.delete(PROJECT_ID, ADMIN_ID),
            ).rejects.toMatchObject({
                statusCode: 403,
            });

            expect(mockedRepository.delete).not.toHaveBeenCalled();
        });

        it("should prevent MEMBER from deleting project", async () => {
            await expect(
                projectService.delete(PROJECT_ID, MEMBER_ID),
            ).rejects.toMatchObject({
                statusCode: 403,
            });

            expect(mockedRepository.delete).not.toHaveBeenCalled();
        });

        it("should throw 404 when project does not exist", async () => {
            mockedRepository.findById.mockResolvedValue(null as never);

            await expect(
                projectService.delete(PROJECT_ID, OWNER_ID),
            ).rejects.toMatchObject({
                statusCode: 404,
            });

            expect(mockedRepository.delete).not.toHaveBeenCalled();
        });

        it("should throw 404 when delete affects no records", async () => {
            mockedRepository.delete.mockResolvedValue({
                count: 0,
            } as never);

            await expect(
                projectService.delete(PROJECT_ID, OWNER_ID),
            ).rejects.toMatchObject({
                statusCode: 404,
            });
        });
    });
});
