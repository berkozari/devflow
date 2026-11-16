import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProjectForm } from "@/features/projects/components/CreateProjectForm";
import { ProjectSettingsForm } from "@/features/projects/components/ProjectSettingsForm";
import { makeProjectDetail } from "./fixtures";

describe("Projects: React forms", () => {
    it("validates a missing project name without submitting", async () => {
        const submit = vi.fn();
        render(<CreateProjectForm onSubmit={submit} />);
        await userEvent.setup().type(screen.getByPlaceholderText("Enter project name"), "ab");
        await userEvent.setup().click(screen.getByRole("button", { name: "Create Project" }));
        expect(await screen.findByText("Project name must be at least 3 characters")).toBeInTheDocument();
        expect(submit).not.toHaveBeenCalled();
    });
    it("submits trimmed data and resets the creation form after success", async () => {
        const submit = vi.fn().mockResolvedValue(undefined);
        render(<CreateProjectForm onSubmit={submit} />);
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText("Enter project name"), "  Launch  ");
        await user.type(screen.getByPlaceholderText("Describe your project"), "  Details  ");
        await user.click(screen.getByRole("button", { name: "Create Project" }));
        await waitFor(() => expect(submit).toHaveBeenCalledWith({ name: "Launch", description: "Details" }));
        await waitFor(() => expect(screen.getByPlaceholderText("Enter project name")).toHaveValue(""));
    });
    it("prevents a second creation while submitting", () => {
        render(<CreateProjectForm onSubmit={vi.fn()} isSubmitting />);
        expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
        expect(screen.getByPlaceholderText("Enter project name")).toBeDisabled();
    });
    it("prevents changes for a read-only project member", () => {
        render(<ProjectSettingsForm project={makeProjectDetail()} onSubmit={vi.fn()} canEdit={false} />);
        expect(screen.getByPlaceholderText("Enter project name")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
        expect(screen.getByRole("combobox")).toBeDisabled();
    });
    it("submits the updated project name and status", async () => {
        const submit = vi.fn().mockResolvedValue(undefined);
        render(<ProjectSettingsForm project={makeProjectDetail()} onSubmit={submit} />);
        const user = userEvent.setup();
        const name = screen.getByPlaceholderText("Enter project name");
        await user.clear(name);
        await user.type(name, "  Revised  ");
        await user.selectOptions(screen.getByRole("combobox"), "COMPLETED");
        await user.click(screen.getByRole("button", { name: "Save Changes" }));
        await waitFor(() => expect(submit).toHaveBeenCalledWith({
            name: "Revised", description: "Product launch board", status: "COMPLETED",
        }));
    });
    it("disables the settings form during an update", () => {
        render(<ProjectSettingsForm project={makeProjectDetail()} onSubmit={vi.fn()} isSubmitting />);
        expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
        expect(screen.getByPlaceholderText("Enter project name")).toBeDisabled();
    });
});
