import { describe, expect, it } from "vitest";
import { taskFormSchema } from "@/features/tasks/schemas/task-form.schema";

const valid = {
    title: "Fix flaky tests",
    description: "Description",
    status: "TODO",
    priority: "MEDIUM",
    assigneeId: "member-1",
    dueDate: "2026-11-30",
};

describe("Tasks: task form schema", () => {
    it("parses and trims a valid title", () => {
        expect(taskFormSchema.parse({ ...valid, title: "  Fix flaky tests  " }).title).toBe("Fix flaky tests");
    });

    it.each(["", " ", "a", " a "])("rejects too-short titles: '%s'", (title) => {
        expect(taskFormSchema.safeParse({ ...valid, title }).success).toBe(false);
    });

    it("accepts a 150-character title and rejects 151", () => {
        expect(taskFormSchema.safeParse({ ...valid, title: "x".repeat(150) }).success).toBe(true);
        expect(taskFormSchema.safeParse({ ...valid, title: "x".repeat(151) }).success).toBe(false);
    });

    it("checks the 5000-character description limit", () => {
        expect(taskFormSchema.safeParse({ ...valid, description: "x".repeat(5000) }).success).toBe(true);
        expect(taskFormSchema.safeParse({ ...valid, description: "x".repeat(5001) }).success).toBe(false);
    });

    it.each(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"])("accepts status %s", (status) => {
        expect(taskFormSchema.safeParse({ ...valid, status }).success).toBe(true);
    });

    it.each(["LOW", "MEDIUM", "HIGH", "URGENT"])("accepts priority %s", (priority) => {
        expect(taskFormSchema.safeParse({ ...valid, priority }).success).toBe(true);
    });

    it("rejects unknown status or priority", () => {
        expect(taskFormSchema.safeParse({ ...valid, status: "BLOCKED" }).success).toBe(false);
        expect(taskFormSchema.safeParse({ ...valid, priority: "CRITICAL" }).success).toBe(false);
    });

    it("accepts unassigned tasks and empty due dates as form strings", () => {
        expect(taskFormSchema.safeParse({ ...valid, assigneeId: "", dueDate: "", description: "" }).success).toBe(true);
    });

    it("requires all the controlled form fields", () => {
        expect(taskFormSchema.safeParse({ title: "Valid name" }).success).toBe(false);
    });
});
