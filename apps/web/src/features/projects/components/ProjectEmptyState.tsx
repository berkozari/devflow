
import { FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ProjectEmptyStateProps {
    onCreateProject: () => void;
}

export function ProjectEmptyState({
    onCreateProject,
}: ProjectEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="size-6 text-muted-foreground" />
            </div>

            <h3 className="text-lg font-semibold">
                No projects yet
            </h3>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Create your first project to organize
                your team's work.
            </p>

            <Button
                className="mt-6"
                onClick={onCreateProject}
            >
                Create your first project
            </Button>
        </div>
    );
}
