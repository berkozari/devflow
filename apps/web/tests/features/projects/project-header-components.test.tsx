import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectHeader } from "@/features/projects/components/ProjectHeader";
import { ProjectStats } from "@/features/projects/components/ProjectStats";
import { MemberRoleSelect } from "@/features/projects/components/MemberRoleSelect";
import { useAuthStore } from "@/stores/auth.store";
import { adminId, makeProjectDetail, memberId, outsiderId, ownerId } from "./fixtures";
import userEvent from "@testing-library/user-event";

beforeEach(() => { useAuthStore.getState().clearAuth(); });
function renderHeader(userId: string) {
    useAuthStore.getState().setAuth("test-token", { id: userId, name: "Tester", email: "tester@example.com" });
    return render(<MemoryRouter><ProjectHeader project={makeProjectDetail()} /></MemoryRouter>);
}

describe("Projects: header, stats and role selector", () => {
    it.each([ownerId, adminId])("shows settings to a managing user (%s)", (id) => {
        renderHeader(id);
        expect(screen.getByRole("link", { name: /Project Settings/ })).toHaveAttribute("href", "/projects/project-1/settings");
        expect(screen.getByRole("link", { name: /Back to Projects/ })).toHaveAttribute("href", "/projects");
    });
    it.each([memberId, outsiderId])("hides settings from a non-manager (%s)", (id) => {
        renderHeader(id);
        expect(screen.queryByRole("link", { name: /Project Settings/ })).not.toBeInTheDocument();
    });
    it("shows readable creation metadata and description fallback", () => {
        render(<MemoryRouter><ProjectHeader project={makeProjectDetail({ description: null })} /></MemoryRouter>);
        expect(screen.getByRole("heading", { name: "DevFlow Launch" })).toBeInTheDocument();
        expect(screen.getByText("No description provided.")).toBeInTheDocument();
        expect(screen.getByText(/Created on/)).toBeInTheDocument();
    });
    it("shows task and actual membership counts", () => {
        render(<ProjectStats project={makeProjectDetail()} />);
        expect(screen.getByText("Total Tasks")).toBeInTheDocument();
        expect(screen.getByText("7")).toBeInTheDocument();
        expect(screen.getByText("Team Members")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });
    it("updates role using an enabled selector", async () => {
        const onChange = vi.fn();
        render(<MemberRoleSelect value="MEMBER" onChange={onChange} />);
        await userEvent.setup().selectOptions(screen.getByRole("combobox"), "ADMIN");
        expect(onChange).toHaveBeenCalledWith("ADMIN");
    });
    it("prevents role updates when disabled", () => {
        render(<MemberRoleSelect value="MEMBER" onChange={vi.fn()} disabled />);
        expect(screen.getByRole("combobox")).toBeDisabled();
    });
});
