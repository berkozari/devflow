import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AddProjectMemberDialog } from "@/features/projects/components/AddProjectMemberDialog";
import { RemoveProjectMemberDialog } from "@/features/projects/components/RemoveProjectMemberDialog";

function AddHarness({ canAssignAdmin = true, isPending = false, submit = vi.fn() }: {
    canAssignAdmin?: boolean;
    isPending?: boolean;
    submit?: (data: { email: string; role?: "ADMIN" | "MEMBER" }) => void;
}) {
    const [open, setOpen] = useState(false);
    return <>
        <button onClick={() => setOpen(true)}>Show add dialog</button>
        <AddProjectMemberDialog open={open} onOpenChange={setOpen} onSubmit={submit}
            isPending={isPending} canAssignAdmin={canAssignAdmin} />
    </>;
}

describe("AddProjectMemberDialog", () => {
    it("rejects an empty email without invoking the API callback", async () => {
        const submit = vi.fn();
        const user = userEvent.setup();
        render(<AddHarness submit={submit} />);
        await user.click(screen.getByRole("button", { name: "Show add dialog" }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add member" }));
        expect(screen.getByText("Email is required.")).toBeInTheDocument();
        expect(submit).not.toHaveBeenCalled();
    });

    it("rejects invalid addresses when the form submit handler runs", async () => {
        const submit = vi.fn();
        const user = userEvent.setup();
        render(<AddHarness submit={submit} />);
        await user.click(screen.getByRole("button", { name: "Show add dialog" }));
        await user.type(screen.getByLabelText("Email address"), "not-an-email");
        const form = screen.getByRole("dialog").querySelector("form");
        expect(form).not.toBeNull();
        // Bypass native email validation to exercise the component's own validation branch.
        fireEvent.submit(form!);
        expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
        expect(submit).not.toHaveBeenCalled();
    });

    it("normalizes email and permits an OWNER to assign ADMIN", async () => {
        const submit = vi.fn();
        const user = userEvent.setup();
        render(<AddHarness submit={submit} />);
        await user.click(screen.getByRole("button", { name: "Show add dialog" }));
        await user.type(screen.getByLabelText("Email address"), "ADMIN@EXAMPLE.COM");
        await user.selectOptions(screen.getByLabelText("Project role"), "ADMIN");
        await user.click(screen.getByRole("button", { name: "Add member" }));
        expect(submit).toHaveBeenCalledWith({
            email: "admin@example.com", role: "ADMIN",
        });
    });

    it("never allows ADMIN to assign the ADMIN role from this dialog", async () => {
        const submit = vi.fn();
        const user = userEvent.setup();
        render(<AddHarness canAssignAdmin={false} submit={submit} />);
        await user.click(screen.getByRole("button", { name: "Show add dialog" }));
        expect(screen.queryByLabelText("Project role")).not.toBeInTheDocument();
        await user.type(screen.getByLabelText("Email address"), "MEMBER@EXAMPLE.COM");
        await user.click(screen.getByRole("button", { name: "Add member" }));
        expect(submit).toHaveBeenCalledWith({
            email: "member@example.com", role: "MEMBER",
        });
    });

    it("clears the address, role, and validation error when cancelled and reopened", async () => {
        const user = userEvent.setup();
        render(<AddHarness />);
        await user.click(screen.getByRole("button", { name: "Show add dialog" }));
        await user.type(screen.getByLabelText("Email address"), "admin@example.com");
        await user.selectOptions(screen.getByLabelText("Project role"), "ADMIN");
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        await user.click(screen.getByRole("button", { name: "Show add dialog" }));
        expect(screen.getByLabelText("Email address")).toHaveValue("");
        expect(screen.getByLabelText("Project role")).toHaveValue("MEMBER");
        expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
    });

    it("disables edits and cancellation while adding", async () => {
        const user = userEvent.setup();
        render(<AddHarness isPending />);
        await user.click(screen.getByRole("button", { name: "Show add dialog" }));
        expect(screen.getByLabelText("Email address")).toBeDisabled();
        expect(screen.getByLabelText("Project role")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Adding..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });
});

describe("RemoveProjectMemberDialog", () => {
    it("names the affected member and confirms exactly once", async () => {
        const confirm = vi.fn();
        const user = userEvent.setup();
        render(<RemoveProjectMemberDialog open onOpenChange={vi.fn()}
            memberName="Alice Example" onConfirm={confirm} isPending={false} />);
        expect(screen.getByRole("dialog")).toHaveTextContent("Alice Example");
        await user.click(screen.getByRole("button", { name: "Remove member" }));
        expect(confirm).toHaveBeenCalledOnce();
    });

    it("cancels without removing the user", async () => {
        const change = vi.fn();
        const confirm = vi.fn();
        const user = userEvent.setup();
        render(<RemoveProjectMemberDialog open onOpenChange={change}
            memberName="Alice Example" onConfirm={confirm} isPending={false} />);
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(change).toHaveBeenCalledWith(false);
        expect(confirm).not.toHaveBeenCalled();
    });

    it("does not permit destructive confirmation while the API is pending", async () => {
        const confirm = vi.fn();
        const user = userEvent.setup();
        render(<RemoveProjectMemberDialog open onOpenChange={vi.fn()}
            memberName="Alice Example" onConfirm={confirm} isPending />);
        expect(screen.getByRole("button", { name: "Removing..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Close" }));
        expect(confirm).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
});
