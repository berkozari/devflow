import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/projects/hooks/useProjectMembers", () => ({ useProjectMembers: vi.fn() }));
vi.mock("@/features/projects/hooks/useAddProjectMember", () => ({ useAddProjectMember: vi.fn() }));
vi.mock("@/features/projects/hooks/useRemoveProjectMember", () => ({ useRemoveProjectMember: vi.fn() }));
vi.mock("@/features/projects/hooks/useUpdateMemberRole", () => ({ useUpdateMemberRole: vi.fn() }));

import { ProjectMembers } from "@/features/projects/components/ProjectMembers";
import { useProjectMembers } from "@/features/projects/hooks/useProjectMembers";
import { useAddProjectMember } from "@/features/projects/hooks/useAddProjectMember";
import { useRemoveProjectMember } from "@/features/projects/hooks/useRemoveProjectMember";
import { useUpdateMemberRole } from "@/features/projects/hooks/useUpdateMemberRole";
import type { ProjectMemberRole } from "@/features/projects/types/project-member.types";
import { adminId, makeMember, memberId, ownerId } from "./fixtures";

const refetch = vi.fn();
function setMembers(overrides: Record<string, unknown> = {}) {
    vi.mocked(useProjectMembers).mockReturnValue({
        isPending: false, isError: false, data: { success: true, data: [
            makeMember("OWNER", ownerId), makeMember("ADMIN", adminId), makeMember("MEMBER", memberId),
        ] }, refetch, ...overrides,
    } as unknown as ReturnType<typeof useProjectMembers>);
}
function renderMembers(role: ProjectMemberRole = "OWNER") {
    return render(<ProjectMembers projectId="project-1" currentUserId={ownerId} currentUserRole={role} />);
}

beforeEach(() => {
    vi.resetAllMocks();
    setMembers();
    vi.mocked(useAddProjectMember).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useAddProjectMember>);
    vi.mocked(useRemoveProjectMember).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useRemoveProjectMember>);
    vi.mocked(useUpdateMemberRole).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateMemberRole>);
});

describe("Projects: team membership display and access", () => {
    it("shows loading state", () => {
        setMembers({ isPending: true, data: undefined });
        renderMembers();
        expect(screen.getByText("Loading members...")).toBeInTheDocument();
    });
    it("shows a fetch failure and allows retry", async () => {
        setMembers({ isError: true, data: undefined });
        renderMembers();
        expect(screen.getByText("Failed to load project members.")).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
        expect(refetch).toHaveBeenCalledOnce();
    });
    it("shows an empty state when no members exist", () => {
        setMembers({ data: { success: true, data: [] } });
        renderMembers("MEMBER");
        expect(screen.getByText("No members found")).toBeInTheDocument();
    });
    it("shows member names and roles", () => {
        renderMembers("MEMBER");
        expect(screen.getByText(`${ownerId}@example.com`)).toBeInTheDocument();
        expect(screen.getByText(`${adminId}@example.com`)).toBeInTheDocument();
        expect(screen.getByText(`${memberId}@example.com`)).toBeInTheDocument();
        expect(screen.getByText("3 project members")).toBeInTheDocument();
    });
    it("hides member-management actions for a MEMBER", () => {
        renderMembers("MEMBER");
        expect(screen.queryByRole("button", { name: "Add member" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: `${memberId} member actions` })).not.toBeInTheDocument();
    });
    it.each(["ADMIN", "OWNER"] as const)("shows the add-member control to %s", (role) => {
        renderMembers(role);
        expect(screen.getByRole("button", { name: "Add member" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: `${ownerId} member actions` })).not.toBeInTheDocument();
    });
});
