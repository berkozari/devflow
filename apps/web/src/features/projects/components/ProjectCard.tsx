
import { Link } from "react-router-dom";
import { FolderKanban, Users, ListTodo } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type {
    ProjectListItem,
    ProjectStatus,
} from "../types/project.types";

interface ProjectCardProps {
    project: ProjectListItem;
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
        className:
            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    COMPLETED: {
        label: "Completed",
        className:
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    ARCHIVED: {
        label: "Archived",
        className: "bg-muted text-muted-foreground",
    },
};

export function ProjectCard({
    project,
}: ProjectCardProps) {
    const status = statusConfig[project.status];

    return (
        <Card className="transition-colors hover:border-primary/50 hover:shadow-md">
            <CardContent className="p-5">
                <Link
                    to={`/projects/${project.id}`}
                    className="block space-y-4 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`View project ${project.name}`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                            <FolderKanban className="size-5 text-primary" />
                        </div>

                        <Badge className={status.className}>
                            {status.label}
                        </Badge>
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-semibold">
                            {project.name}
                        </h3>

                        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                            {project.description ||
                                "No description provided."}
                        </p>
                    </div>

                    <div className="flex items-center gap-5 border-t pt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Users className="size-4" />
                            <span>
                                {project._count.members ?? 0} members
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <ListTodo className="size-4" />
                            <span>
                                {project._count.tasks} tasks
                            </span>
                        </div>
                    </div>
                </Link>
            </CardContent>
        </Card>
    );
}
