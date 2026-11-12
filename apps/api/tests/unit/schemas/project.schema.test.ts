import { describe, expect, it } from "vitest";

import { createProjectSchema, updateProjectSchema, projectParamsSchema, projectQuerySchema, } from "../../../src/schemas/project.schema.js";

describe("Project Schemas", () => {
    describe("createProjectSchema", () => {
        it("should accept valid project data", () => {
            const result = createProjectSchema.safeParse({ name: "Test Project", description: "Test description", });

            expect(result.success).toBe(true);
        });

        it("should trim project name and description", () => {
            const result = createProjectSchema.parse({
                name: "  Test Project  ",
                description: "  Description  ",
            });

            expect(result.name).toBe("Test Project");
            expect(result.description).toBe("Description");
        });

        it("should accept project without description", () => {
            expect(
                createProjectSchema.safeParse({
                    name: "Test Project",
                }).success,
            ).toBe(true);
        });

        it("should reject names shorter than 3 characters", () => {
            expect(
                createProjectSchema.safeParse({
                    name: "AB",
                }).success,
            ).toBe(false);
        });

        it("should reject names longer than 100 characters", () => {
            expect(
                createProjectSchema.safeParse({
                    name: "A".repeat(101),
                }).success,
            ).toBe(false);
        });

        it("should reject descriptions longer than 1000 characters", () => {
            expect(
                createProjectSchema.safeParse({
                    name: "Test Project",
                    description: "A".repeat(1001),
                }).success,
            ).toBe(false);
        });

        it("should reject non-string names", () => {
            expect(
                createProjectSchema.safeParse({
                    name: 123,
                }).success,
            ).toBe(false);
        });
    });

    describe("updateProjectSchema", () => {
        it("should accept valid update data", () => {
            expect(
                updateProjectSchema.safeParse({
                    name: "Updated Project",
                    status: "ACTIVE",
                }).success,
            ).toBe(true);
        });

        it("should accept nullable description", () => {
            expect(
                updateProjectSchema.safeParse({
                    description: null,
                }).success,
            ).toBe(true);
        });

        it("should accept each valid project status", () => {
            for (const status of [
                "PLANNING",
                "ACTIVE",
                "COMPLETED",
                "ARCHIVED",
            ]) {
                expect(
                    updateProjectSchema.safeParse({
                        status,
                    }).success,
                ).toBe(true);
            }
        });

        it("should reject invalid project status", () => {
            expect(
                updateProjectSchema.safeParse({
                    status: "INVALID",
                }).success,
            ).toBe(false);
        });

        it("should reject names shorter than 3 characters", () => {
            expect(
                updateProjectSchema.safeParse({
                    name: "AB",
                }).success,
            ).toBe(false);
        });

        it("should reject names longer than 100 characters", () => {
            expect(
                updateProjectSchema.safeParse({
                    name: "A".repeat(101),
                }).success,
            ).toBe(false);
        });

        it("should reject descriptions longer than 1000 characters", () => {
            expect(
                updateProjectSchema.safeParse({
                    description: "A".repeat(1001),
                }).success,
            ).toBe(false);
        });

        it("should reject empty update data", () => {
            expect(
                updateProjectSchema.safeParse({}).success,
            ).toBe(false);
        });

        it("should accept multiple update fields", () => {
            expect(
                updateProjectSchema.safeParse({
                    name: "Updated Project",
                    description: "Updated description",
                    status: "COMPLETED",
                }).success,
            ).toBe(true);
        });
    });

    describe("projectParamsSchema", () => {
        it("should accept valid UUID", () => {
            expect(
                projectParamsSchema.safeParse({
                    id: "00000000-0000-4000-8000-000000000001",
                }).success,
            ).toBe(true);
        });

        it("should reject invalid UUID", () => {
            expect(
                projectParamsSchema.safeParse({
                    id: "invalid-id",
                }).success,
            ).toBe(false);
        });
    });

    describe("projectQuerySchema", () => {
        it("should apply default pagination values", () => {
            const result = projectQuerySchema.parse({});

            expect(result).toEqual({
                page: 1,
                limit: 10,
            });
        });

        it("should coerce pagination values to numbers", () => {
            const result = projectQuerySchema.parse({
                page: "2",
                limit: "20",
            });

            expect(result.page).toBe(2);
            expect(result.limit).toBe(20);
        });

        it("should accept valid search and status", () => {
            const result = projectQuerySchema.safeParse({
                search: "Test",
                status: "ACTIVE",
            });

            expect(result.success).toBe(true);
        });

        it("should trim search value", () => {
            const result = projectQuerySchema.parse({
                search: "  Test  ",
            });

            expect(result.search).toBe("Test");
        });

        it("should reject page smaller than 1", () => {
            expect(
                projectQuerySchema.safeParse({
                    page: "0",
                }).success,
            ).toBe(false);
        });

        it("should reject non-integer page", () => {
            expect(
                projectQuerySchema.safeParse({
                    page: "1.5",
                }).success,
            ).toBe(false);
        });

        it("should reject limit smaller than 1", () => {
            expect(
                projectQuerySchema.safeParse({
                    limit: "0",
                }).success,
            ).toBe(false);
        });

        it("should reject limit greater than 50", () => {
            expect(
                projectQuerySchema.safeParse({
                    limit: "51",
                }).success,
            ).toBe(false);
        });

        it("should reject search longer than 100 characters", () => {
            expect(
                projectQuerySchema.safeParse({
                    search: "A".repeat(101),
                }).success,
            ).toBe(false);
        });

        it("should reject invalid status", () => {
            expect(
                projectQuerySchema.safeParse({
                    status: "INVALID",
                }).success,
            ).toBe(false);
        });
    });


});