import { describe, expect, it } from "vitest";
import {
    canManageTasks, canEditTask, canEditTaskFields, canChangeTaskStatus, canDeleteTask,
} from "@/features/tasks/utils/task.permissions";
import { makeTask } from "./fixtures";

const assigned = makeTask();

describe("Tasks: permission boundaries", () => {
    it.each(["OWNER", "ADMIN"])("allows %s to manage tasks and edit any task", (role) => {
        expect(canManageTasks(role)).toBe(true);
        expect(canEditTask(assigned, { role, userId: "someone-else" })).toBe(true);
        expect(canEditTaskFields({ role, userId: "someone-else" })).toBe(true);
        expect(canChangeTaskStatus(assigned, { role, userId: "someone-else" })).toBe(true);
    });

    it("allows an assigned MEMBER to edit their task status but not all fields", () => {
        const context = { role: "MEMBER", userId: "member-1" };
        expect(canManageTasks(context.role)).toBe(false);
        expect(canEditTask(assigned, context)).toBe(true);
        expect(canChangeTaskStatus(assigned, context)).toBe(true);
        expect(canEditTaskFields(context)).toBe(false);
    });

    it("prevents an unassigned MEMBER from editing and changing status", () => {
        const context = { role: "MEMBER", userId: "other-member" };
        expect(canEditTask(assigned, context)).toBe(false);
        expect(canChangeTaskStatus(assigned, context)).toBe(false);
        expect(canEditTask(makeTask({ assigneeId: null }), { role: "MEMBER", userId: "member-1" })).toBe(false);
    });

    it.each(["VIEWER", "GUEST", "", "owner"])("rejects an unsupported role '%s'", (role) => {
        const context = { role, userId: "member-1" };
        expect(canManageTasks(role)).toBe(false);
        expect(canEditTask(assigned, context)).toBe(false);
        expect(canEditTaskFields(context)).toBe(false);
        expect(canChangeTaskStatus(assigned, context)).toBe(false);
    });

    it("only allows the OWNER to delete tasks", () => {
        expect(canDeleteTask("OWNER")).toBe(true);
        expect(canDeleteTask("ADMIN")).toBe(false);
        expect(canDeleteTask("MEMBER")).toBe(false);
    });
});
