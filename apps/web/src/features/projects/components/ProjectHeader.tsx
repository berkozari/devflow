
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useAuthStore } from "../../../stores/auth.store";
import { getProjectPermissions } from "../utils/project-permissions";

import type {
    ProjectDetail,
    ProjectStatus,
} from "../types/project.types";

interface ProjectHeaderProps {
    project: ProjectDetail;
}

const statusConfig: Record<
    ProjectStatus,
    { label: string; className: string }
> = {
    PLANNING: {
        label: "Planning",
        className: "bg-secondary text-secondary-foreground",
    },
    ACTIVE: {
        label: "Active",
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    COMPLETED: {
        label: "Completed",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    ARCHIVED: {
        label: "Archived",
        className: "bg-muted text-muted-foreground",
    },
};

export function ProjectHeader({
    project,
}: ProjectHeaderProps) {
    const status = statusConfig[project.status];

    const userId = useAuthStore((state) => state.user?.id);

    const permissions = getProjectPermissions(
        project,
        userId,
    );

    return (
        <div className="space-y-5">
            <Button
                variant="ghost"
                size="sm"
                asChild
                className="-ml-3"
            >
                <Link to="/projects">
                    <ArrowLeft className="mr-2 size-4" />
                    Back to Projects
                </Link>
            </Button>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {project.name}
                        </h1>

                        <Badge className={status.className}>
                            {status.label}
                        </Badge>
                    </div>

                    <p className="max-w-2xl text-sm text-muted-foreground">
                        {project.description ||
                            "No description provided."}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="size-4" />
                        Created on{" "}
                        {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                </div>

                {permissions.canUpdateProject && (
                    <Button variant="outline" asChild>
                        <Link to={`/projects/${project.id}/settings`}>
                            <Settings className="mr-2 size-4" />
                            Project Settings
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
