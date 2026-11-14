
import { useState } from "react";

import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog";
import { ProjectList } from "@/features/projects/components/ProjectList";

export function ProjectsPage() {
    const [createDialogOpen, setCreateDialogOpen] =
        useState(false);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        Projects
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Manage and organize your projects.
                    </p>
                </div>

                <CreateProjectDialog
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                />
            </div>

            <ProjectList
                onCreateProject={() => setCreateDialogOpen(true)}
            />
        </div>
    );
}
