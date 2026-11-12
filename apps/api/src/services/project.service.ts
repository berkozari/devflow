
import { projectRepository } from "../repositories/project.repository.js";
import type {
    CreateProjectInput,
    UpdateProjectInput,
    ProjectQueryInput,
} from "../schemas/project.schema.js";

export const projectService = {
    async create(userId: string, data: CreateProjectInput) {
        return projectRepository.create(userId, data);
    },

    async findMany(userId: string, query: ProjectQueryInput) {
        return projectRepository.findMany(userId, query);
    },

    async findById(projectId: string, userId: string) {
        const project = await projectRepository.findById(
            projectId,
            userId,
        );

        if (!project) {
            throw new Error("PROJECT_NOT_FOUND");
        }

        return project;
    },

    async update(
        projectId: string,
        userId: string,
        data: UpdateProjectInput,
    ) {
        const existingProject = await projectRepository.findById(
            projectId,
            userId,
        );

        if (!existingProject) {
            throw new Error("PROJECT_NOT_FOUND");
        }

        await projectRepository.update(projectId, userId, data);

        return projectRepository.findById(projectId, userId);
    },

    async delete(projectId: string, userId: string) {
        const existingProject = await projectRepository.findById(
            projectId,
            userId,
        );

        if (!existingProject) {
            throw new Error("PROJECT_NOT_FOUND");
        }

        await projectRepository.delete(projectId, userId);

        return { success: true };
    },
};
