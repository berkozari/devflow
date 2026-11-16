import { describe, expect, it } from "vitest";
import {
    addProjectMemberSchema,
    createProjectSchema,
    projectMemberParamsSchema,
    updateProjectMemberSchema,
    updateProjectSchema,
} from "@/features/projects/schemas/project.schema";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("Projects: Zod schemas", () => {
    describe("createProjectSchema", () => {
        it("trims the name and description", () => {
            expect(createProjectSchema.parse({ name: "  Launch  ", description: "  Notes  " }))
                .toEqual({ name: "Launch", description: "Notes" });
        });
        it("accepts an omitted description", () => {
            expect(createProjectSchema.parse({ name: "Launch" })).toEqual({ name: "Launch" });
        });
        it.each(["", "a", "ab", "    "])("rejects an invalid short name %j", (name) => {
            expect(createProjectSchema.safeParse({ name }).success).toBe(false);
        });
        it("accepts name length 100 but rejects 101", () => {
            expect(createProjectSchema.safeParse({ name: "a".repeat(100) }).success).toBe(true);
            expect(createProjectSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false);
        });
        it("accepts description length 1000 but rejects 1001", () => {
            expect(createProjectSchema.safeParse({ name: "Launch", description: "a".repeat(1000) }).success).toBe(true);
            expect(createProjectSchema.safeParse({ name: "Launch", description: "a".repeat(1001) }).success).toBe(false);
        });
    });

    describe("updateProjectSchema", () => {
        const valid = { name: "Updated", description: "New notes", status: "ACTIVE" };
        it.each(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"])("accepts status %s", (status) => {
            expect(updateProjectSchema.safeParse({ ...valid, status }).success).toBe(true);
        });
        it("requires every field", () => {
            expect(updateProjectSchema.safeParse({ name: "Updated" }).success).toBe(false);
        });
        it("rejects an unknown project status", () => {
            expect(updateProjectSchema.safeParse({ ...valid, status: "DELETED" }).success).toBe(false);
        });
        it("trims updated fields", () => {
            expect(updateProjectSchema.parse({ ...valid, name: "  Updated  ", description: "  Notes  " }))
                .toEqual({ name: "Updated", description: "Notes", status: "ACTIVE" });
        });
    });

    describe("project membership schemas", () => {
        it("normalizes email and defaults the role to MEMBER", () => {
            expect(addProjectMemberSchema.parse({ email: "  USER@EXAMPLE.COM  " }))
                .toEqual({ email: "user@example.com", role: "MEMBER" });
        });
        it("accepts ADMIN explicitly", () => {
            expect(addProjectMemberSchema.parse({ email: "admin@example.com", role: "ADMIN" }).role).toBe("ADMIN");
        });
        it.each(["OWNER", "GUEST", ""])("rejects prohibited role %j", (role) => {
            expect(addProjectMemberSchema.safeParse({ email: "user@example.com", role }).success).toBe(false);
            expect(updateProjectMemberSchema.safeParse({ role }).success).toBe(false);
        });
        it("rejects malformed or oversized emails", () => {
            expect(addProjectMemberSchema.safeParse({ email: "invalid-email" }).success).toBe(false);
            expect(addProjectMemberSchema.safeParse({ email: `${"a".repeat(260)}@example.com` }).success).toBe(false);
        });
        it("accepts ADMIN and MEMBER updates", () => {
            expect(updateProjectMemberSchema.parse({ role: "ADMIN" })).toEqual({ role: "ADMIN" });
            expect(updateProjectMemberSchema.parse({ role: "MEMBER" })).toEqual({ role: "MEMBER" });
        });
        it("validates project and user UUIDs independently", () => {
            expect(projectMemberParamsSchema.safeParse({ id: uuid, userId: uuid }).success).toBe(true);
            expect(projectMemberParamsSchema.safeParse({ id: "not-uuid", userId: uuid }).success).toBe(false);
            expect(projectMemberParamsSchema.safeParse({ id: uuid, userId: "not-uuid" }).success).toBe(false);
        });
    });
});
