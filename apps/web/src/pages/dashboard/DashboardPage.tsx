
import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog";

export function DashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Dashboard
                    </h1>

                    <p className="text-muted-foreground">
                        Welcome to your DevFlow workspace.
                    </p>
                </div>

                <CreateProjectDialog />
            </div>
        </div>
    );
}
