
import type { ProjectMemberRole } from "../types/project-member.types";

interface MemberRoleSelectProps {
    value: Exclude<ProjectMemberRole, "OWNER">;
    onChange: (role: Exclude<ProjectMemberRole, "OWNER">) => void;
    disabled?: boolean;
}

export function MemberRoleSelect({
    value,
    onChange,
    disabled = false,
}: MemberRoleSelectProps) {
    return (
        <select
            value={value}
            disabled={disabled}
            onChange={(event) =>
                onChange(
                    event.target.value as Exclude<
                        ProjectMemberRole,
                        "OWNER"
                    >,
                )
            }
            className="h-10 rounded-md border bg-background px-3 text-sm"
        >
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
        </select>
    );
}
