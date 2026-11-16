import type { PropsWithChildren } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskFormModal } from "@/features/tasks/components/TaskFormModal";
import { makeTask } from "./fixtures";

// Keep Radix portal/focus management outside these focused form behavior tests.
vi.mock("@/components/ui/dialog", () => {
    const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
    return {
        Dialog: ({ open, children }: PropsWithChildren<{ open: boolean }>) => open ? <div>{children}</div> : null,
        DialogContent: Container, DialogDescription: Container, DialogFooter: Container,
        DialogHeader: Container, DialogTitle: Container,
    };
});

describe("Tasks: create/edit form", () => {
    it("does not render a closed form", () => {
        render(<TaskFormModal open={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} isPending={false} />);
        expect(screen.queryByText("Create task")).not.toBeInTheDocument();
    });

    it("validates a missing or too-short task title", async () => {
        const submit = vi.fn();
        render(<TaskFormModal open onOpenChange={vi.fn()} onSubmit={submit} isPending={false} />);
        await userEvent.setup().click(screen.getByRole("button", { name: "Create task" }));
        expect(await screen.findByText("Title must be at least 2 characters.")).toBeInTheDocument();
        expect(submit).not.toHaveBeenCalled();
    });

    it("submits normalized task data and chosen status, priority and assignee", async () => {
        const submit = vi.fn();
        const assignee = makeTask().assignee!;
        render(<TaskFormModal open onOpenChange={vi.fn()} onSubmit={submit} isPending={false} defaultStatus="IN_PROGRESS" assignees={[assignee]} />);
        const user = userEvent.setup();
        await user.type(screen.getByLabelText("Title"), "  Ship feature  ");
        await user.type(screen.getByLabelText("Description"), "  Release notes  ");
        await user.selectOptions(screen.getByLabelText("Priority"), "HIGH");
        await user.selectOptions(screen.getByLabelText("Assignee"), assignee.id);
        await user.click(screen.getByRole("button", { name: "Create task" }));
        await waitFor(() => expect(submit).toHaveBeenCalledWith({
            title: "Ship feature", description: "Release notes", status: "IN_PROGRESS",
            priority: "HIGH", assigneeId: assignee.id, dueDate: null,
        }));
    });

    it("allows assigned members to submit only status changes", async () => {
        const submit = vi.fn();
        render(<TaskFormModal open task={makeTask()} canEditAllFields={false} onOpenChange={vi.fn()} onSubmit={submit} isPending={false} />);
        expect(screen.getByLabelText("Title")).toBeDisabled();
        expect(screen.getByLabelText("Priority")).toBeDisabled();
        expect(screen.getByLabelText("Status")).not.toBeDisabled();
        await userEvent.setup().selectOptions(screen.getByLabelText("Status"), "DONE");
        await userEvent.setup().click(screen.getByRole("button", { name: "Save changes" }));
        await waitFor(() => expect(submit).toHaveBeenCalledWith({ status: "DONE" }));
    });

    it("disables changes and submission during an active mutation", () => {
        render(<TaskFormModal open task={makeTask()} onOpenChange={vi.fn()} onSubmit={vi.fn()} isPending />);
        expect(screen.getByLabelText("Title")).toBeDisabled();
        expect(screen.getByLabelText("Status")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    it("closes the form from Cancel when no mutation is running", async () => {
        const onOpenChange = vi.fn();
        render(<TaskFormModal open onOpenChange={onOpenChange} onSubmit={vi.fn()} isPending={false} />);
        await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
