
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import type {
    TaskFilters as TaskFiltersType,
    TaskPriority,
    TaskStatus,
} from "../types/task.types";

import type { ProjectMember } from "@/features/projects/types/project-member.types";

interface TaskFiltersProps {
    filters: TaskFiltersType;
    onChange: (filters: TaskFiltersType) => void;
    members: ProjectMember[];
}

const priorities: TaskPriority[] = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
];

const statuses: {
    value: TaskStatus;
    label: string;
}[] = [
        { value: "TODO", label: "To Do" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "IN_REVIEW", label: "In Review" },
        { value: "DONE", label: "Done" },
    ];

export function TaskFilters({
    filters,
    onChange,
    members,
}: TaskFiltersProps) {
    const [search, setSearch] = useState(
        filters.search ?? "",
    );

    const [previousExternalSearch, setPreviousExternalSearch] =
        useState(filters.search);

    // Synchronize local search when external filters change.
    if (filters.search !== previousExternalSearch) {
        setPreviousExternalSearch(filters.search);
        setSearch(filters.search ?? "");
    }

    // Debounce search requests.
    useEffect(() => {
        const normalizedSearch = search.trim();

        if (normalizedSearch === (filters.search ?? "")) {
            return;
        }

        const timeout = setTimeout(() => {
            onChange({
                ...filters,
                search: normalizedSearch || undefined,
                page: 1,
            });
        }, 400);

        return () => clearTimeout(timeout);
    }, [search, filters, onChange]);

    const updateFilter = (
        key: "status" | "priority" | "assigneeId",
        value: string,
    ) => {
        onChange({
            ...filters,
            [key]: value || undefined,
            page: 1,
        });
    };

    const clearFilters = () => {
        setSearch("");

        onChange({
            page: 1,
            limit: filters.limit ?? 100,
        });
    };

    const hasFilters = Boolean(
        filters.search ||
        filters.status ||
        filters.priority ||
        filters.assigneeId,
    );

    return (
        <div className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                    placeholder="Search tasks..."
                    value={search}
                    onChange={(event) =>
                        setSearch(event.target.value)
                    }
                    className="pl-9"
                />
            </div>

            <select
                value={filters.status ?? ""}
                onChange={(event) =>
                    updateFilter("status", event.target.value)
                }
                className="h-10 rounded-md border bg-background px-3 text-sm"
            >
                <option value="">All statuses</option>

                {statuses.map((status) => (
                    <option
                        key={status.value}
                        value={status.value}
                    >
                        {status.label}
                    </option>
                ))}
            </select>

            <select
                value={filters.priority ?? ""}
                onChange={(event) =>
                    updateFilter("priority", event.target.value)
                }
                className="h-10 rounded-md border bg-background px-3 text-sm"
            >
                <option value="">All priorities</option>

                {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                        {priority}
                    </option>
                ))}
            </select>

            <select
                value={filters.assigneeId ?? ""}
                onChange={(event) =>
                    updateFilter("assigneeId", event.target.value)
                }
                className="h-10 rounded-md border bg-background px-3 text-sm"
            >
                <option value="">All assignees</option>

                {members.map((member) => (
                    <option
                        key={member.userId}
                        value={member.userId}
                    >
                        {member.user.name}
                    </option>
                ))}
            </select>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                >
                    <X className="mr-2 size-4" />
                    Clear
                </Button>
            )}
        </div>
    );
}
