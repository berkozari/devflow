
import { useState } from "react";
import { Users, UserPlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ProjectMemberItem } from "./ProjectMemberItem";
import { AddProjectMemberDialog } from "./AddProjectMemberDialog";
import { RemoveProjectMemberDialog } from "./RemoveProjectMemberDialog";
import { MemberRoleSelect } from "./MemberRoleSelect";

import { useProjectMembers } from "../hooks/useProjectMembers";
import { useAddProjectMember } from "../hooks/useAddProjectMember";
import { useRemoveProjectMember } from "../hooks/useRemoveProjectMember";
import { useUpdateMemberRole } from "../hooks/useUpdateMemberRole";

import type {
    ProjectMember,
    ProjectMemberRole,
} from "../types/project-member.types";

interface ProjectMembersProps {
    projectId: string;
    currentUserId: string;
    currentUserRole: ProjectMemberRole;
}

export function ProjectMembers({
    projectId,
    currentUserRole,
}: ProjectMembersProps) {
    const [addOpen, setAddOpen] = useState(false);
    const [selectedMember, setSelectedMember] =
        useState<ProjectMember | null>(null);
    const [removeMember, setRemoveMember] =
        useState<ProjectMember | null>(null);

    const membersQuery = useProjectMembers(projectId);
    const addMutation = useAddProjectMember(projectId);
    const removeMutation = useRemoveProjectMember(projectId);
    const updateMutation = useUpdateMemberRole(projectId);

    const members = membersQuery.data?.data ?? [];

    const canManage = currentUserRole === "OWNER" ||
        currentUserRole === "ADMIN";

    const canChangeRole = currentUserRole === "OWNER";

    if (membersQuery.isPending) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                    Loading members...
                </span>
            </div>
        );
    }

    if (membersQuery.isError) {
        return (
            <div className="rounded-lg border border-destructive/30 p-6 text-center">
                <p className="text-sm text-destructive">
                    Failed to load project members.
                </p>

                <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => membersQuery.refetch()}
                >
                    Try again
                </Button>
            </div>
        );
    }

    const handleRoleChange = (
        member: ProjectMember,
        role: Exclude<ProjectMemberRole, "OWNER">,
    ) => {
        updateMutation.mutate(
            {
                userId: member.userId,
                data: { role },
            },
            {
                onSuccess: () => setSelectedMember(null),
            },
        );
    };

    const handleRemove = () => {
        if (!removeMember) return;

        removeMutation.mutate(removeMember.userId, {
            onSuccess: () => setRemoveMember(null),
        });
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Users className="size-5" />

                        <h2 className="text-lg font-semibold">
                            Team members
                        </h2>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {members.length} project members
                    </p>
                </div>

                {canManage && (
                    <Button onClick={() => setAddOpen(true)}>
                        <UserPlus className="mr-2 size-4" />
                        Add member
                    </Button>
                )}
            </div>

            {members.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <Users className="mx-auto size-8 text-muted-foreground" />

                    <p className="mt-3 font-medium">
                        No members found
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Add members to collaborate on this project.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {members.map((member) => (
                        <div key={member.id}>
                            <ProjectMemberItem
                                member={member}
                                canManage={canManage}
                                canChangeRole={canChangeRole}
                                onChangeRole={setSelectedMember}
                                onRemove={setRemoveMember}
                            />

                            {selectedMember?.id === member.id && (
                                <div className="mt-2 flex items-center gap-2">
                                    <MemberRoleSelect
                                        value={
                                            member.role === "ADMIN"
                                                ? "ADMIN"
                                                : "MEMBER"
                                        }
                                        onChange={(role) =>
                                            handleRoleChange(member, role)
                                        }
                                        disabled={updateMutation.isPending}
                                    />

                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSelectedMember(null)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <AddProjectMemberDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                onSubmit={(data) =>
                    addMutation.mutate(data, {
                        onSuccess: () => {
                            setAddOpen(false);
                        },
                    })
                }
                isPending={addMutation.isPending}
                canAssignAdmin={canChangeRole}
            />

            <RemoveProjectMemberDialog
                open={Boolean(removeMember)}
                onOpenChange={(open) => {
                    if (!open) setRemoveMember(null);
                }}
                memberName={removeMember?.user.name ?? ""}
                onConfirm={handleRemove}
                isPending={removeMutation.isPending}
            />
        </div>
    );
}
