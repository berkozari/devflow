import type { PropsWithChildren } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Only the Radix dropdown portal is replaced; real ProjectMemberItem buttons,
// role checks and membership dialogs remain under test.
vi.mock("@/components/ui/dropdown-menu", () => ({
    DropdownMenu: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onSelect }: PropsWithChildren<{ onSelect?: () => void }>) =>
        <button type="button" role="menuitem" onClick={onSelect}>{children}</button>,
}));
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

const add = vi.fn();
const remove = vi.fn();
const update = vi.fn();

function renderMembers(role: ProjectMemberRole) {
    return render(<ProjectMembers projectId="project-1" currentUserId={ownerId} currentUserRole={role} />);
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useProjectMembers).mockReturnValue({
        isPending: false, isError: false,
        data: { success: true, data: [
            makeMember("OWNER", ownerId), makeMember("ADMIN", adminId), makeMember("MEMBER", memberId),
        ] },
    } as unknown as ReturnType<typeof useProjectMembers>);
    vi.mocked(useAddProjectMember).mockReturnValue({
        mutate: add, isPending: false,
    } as unknown as ReturnType<typeof useAddProjectMember>);
    vi.mocked(useRemoveProjectMember).mockReturnValue({
        mutate: remove, isPending: false,
    } as unknown as ReturnType<typeof useRemoveProjectMember>);
    vi.mocked(useUpdateMemberRole).mockReturnValue({
        mutate: update, isPending: false,
    } as unknown as ReturnType<typeof useUpdateMemberRole>);
});

describe("ProjectMembers: role-protected mutation flows", () => {
    it("lets OWNER invite an ADMIN and closes only after mutation success", async () => {
        const user = userEvent.setup();
        renderMembers("OWNER");
        await user.click(screen.getByRole("button", { name: "Add member" }));
        const dialog = screen.getByRole("dialog");
        await user.type(within(dialog).getByLabelText("Email address"), "new.admin@example.com");
        await user.selectOptions(within(dialog).getByLabelText("Project role"), "ADMIN");
        await user.click(within(dialog).getByRole("button", { name: "Add member" }));
        expect(add).toHaveBeenCalledWith(
            { email: "new.admin@example.com", role: "ADMIN" },
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        act(() => { (add.mock.calls[0]?.[1] as { onSuccess: () => void }).onSuccess(); });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("lets ADMIN invite only MEMBER, not grant ADMIN rights", async () => {
        const user = userEvent.setup();
        renderMembers("ADMIN");
        await user.click(screen.getByRole("button", { name: "Add member" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).queryByLabelText("Project role")).not.toBeInTheDocument();
        await user.type(within(dialog).getByLabelText("Email address"), "new.member@example.com");
        await user.click(within(dialog).getByRole("button", { name: "Add member" }));
        expect(add).toHaveBeenCalledWith(
            { email: "new.member@example.com", role: "MEMBER" },
            expect.any(Object),
        );
        expect(update).not.toHaveBeenCalled();
    });

    it("lets OWNER change the role of a non-owner member", async () => {
        const user = userEvent.setup();
        renderMembers("OWNER");
        expect(screen.queryByRole("button", { name: `${ownerId} member actions` })).not.toBeInTheDocument();
        await user.click(screen.getAllByRole("menuitem", { name: "Change role" })[1]);
        const select = screen.getByRole("combobox");
        expect(select).toHaveValue("MEMBER");
        await user.selectOptions(select, "ADMIN");
        expect(update).toHaveBeenCalledWith(
            { userId: memberId, data: { role: "ADMIN" } },
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
        act(() => { (update.mock.calls[0]?.[1] as { onSuccess: () => void }).onSuccess(); });
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("does not let ADMIN change roles, but allows removal with confirmation", async () => {
        const user = userEvent.setup();
        renderMembers("ADMIN");
        expect(screen.queryByRole("menuitem", { name: "Change role" })).not.toBeInTheDocument();
        expect(screen.getAllByRole("menuitem", { name: "Remove member" })).toHaveLength(2);
        await user.click(screen.getAllByRole("menuitem", { name: "Remove member" })[1]);
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent(memberId);
        await user.click(within(dialog).getByRole("button", { name: "Remove member" }));
        expect(remove).toHaveBeenCalledWith(memberId, expect.objectContaining({ onSuccess: expect.any(Function) }));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        act(() => { (remove.mock.calls[0]?.[1] as { onSuccess: () => void }).onSuccess(); });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("cancels removal without calling the mutation", async () => {
        const user = userEvent.setup();
        renderMembers("OWNER");
        await user.click(screen.getAllByRole("menuitem", { name: "Remove member" })[1]);
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(remove).not.toHaveBeenCalled();
    });

    it("hides all management controls from MEMBER", () => {
        renderMembers("MEMBER");
        expect(screen.queryByRole("button", { name: "Add member" })).not.toBeInTheDocument();
        expect(screen.queryByRole("menuitem", { name: "Change role" })).not.toBeInTheDocument();
        expect(screen.queryByRole("menuitem", { name: "Remove member" })).not.toBeInTheDocument();
        expect(add).not.toHaveBeenCalled();
        expect(remove).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });
});
