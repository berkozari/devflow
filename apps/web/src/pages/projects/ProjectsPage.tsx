import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog";
import { ProjectList } from "@/features/projects/components/ProjectList";

export function ProjectsPage() {
    const [createDialogOpen, setCreateDialogOpen] =
        useState(false);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        Projects
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Manage and organize your projects.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        <Plus className="mr-2 size-4" />
                        New Project
                    </Button>

                    <CreateProjectDialog
                        open={createDialogOpen}
                        onOpenChange={setCreateDialogOpen}
                    />
                </div>
            </div>

            <ProjectList
                onCreateProject={() => setCreateDialogOpen(true)}
            />
        </div>
    );
}