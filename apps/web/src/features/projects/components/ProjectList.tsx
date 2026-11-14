
import { useProjects } from "../hooks/useProjects";
import { ProjectCard } from "./ProjectCard";
import { ProjectEmptyState } from "./ProjectEmptyState";

import { Button } from "@/components/ui/button";

interface ProjectListProps {
    onCreateProject: () => void;
}

export function ProjectList({
    onCreateProject,
}: ProjectListProps) {
    const { data, isPending, isError, error, refetch } =
        useProjects();

    if (isPending) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-48 animate-pulse rounded-xl border bg-muted/50"
                    />
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div
                role="alert"
                className="rounded-xl border border-destructive/30 p-6 text-center"
            >
                <p className="font-medium">
                    Unable to load projects
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                    {error.message}
                </p>

                <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="mt-4"
                >
                    Try again
                </Button>
            </div>
        );
    }

    const projects = data.data;

    if (projects.length === 0) {
        return (
            <ProjectEmptyState
                onCreateProject={onCreateProject}
            />
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                />
            ))}
        </div>
    );
}
