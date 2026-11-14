
import { MoreHorizontal, Shield, UserRound, Crown } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import type { ProjectMember } from "../types/project-member.types";

interface ProjectMemberItemProps {
    member: ProjectMember;
    canManage: boolean;
    canChangeRole: boolean;
    onChangeRole: (member: ProjectMember) => void;
    onRemove: (member: ProjectMember) => void;
}

export function ProjectMemberItem({
    member,
    canManage,
    canChangeRole,
    onChangeRole,
    onRemove,
}: ProjectMemberItemProps) {
    const initials = member.user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const roleConfig = {
        OWNER: {
            label: "Owner",
            icon: Crown,
        },
        ADMIN: {
            label: "Admin",
            icon: Shield,
        },
        MEMBER: {
            label: "Member",
            icon: UserRound,
        },
    };

    const RoleIcon = roleConfig[member.role].icon;

    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex min-w-0 items-center gap-3">
                <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                    <p className="truncate font-medium">
                        {member.user.name}
                    </p>

                    <p className="truncate text-sm text-muted-foreground">
                        {member.user.email}
                    </p>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary">
                    <RoleIcon className="mr-1 size-3" />
                    {roleConfig[member.role].label}
                </Badge>

                {canManage && member.role !== "OWNER" && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`${member.user.name} member actions`}
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            {canChangeRole && (
                                <DropdownMenuItem
                                    onSelect={() => onChangeRole(member)}
                                >
                                    Change role
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => onRemove(member)}
                            >
                                Remove member
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}
