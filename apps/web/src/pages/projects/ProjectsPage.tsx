import { CreateProjectDialog } from "@/features/projects/components";

export function ProjectsPage() {
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

                <CreateProjectDialog />
            </div>
        </div>
    );
}