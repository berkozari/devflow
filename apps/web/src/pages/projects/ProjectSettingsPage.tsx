
import { Link, useNavigate, useParams } from "react-router-dom";

import { ArrowLeft, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useProject } from "@/features/projects/hooks/useProject";
import { useUpdateProject } from "@/features/projects/hooks/useUpdateProject";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

import { ProjectSettingsForm } from "@/features/projects/components/ProjectSettingsForm";

import { DeleteProjectDialog } from "@/features/projects/components/DeleteProjectDialog";

import type {
    UpdateProjectFormValues,
} from "@/features/projects/schemas/project.schema";

export function ProjectSettingsPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const projectQuery = useProject(projectId ?? "");
    const currentUserQuery = useCurrentUser();

    const updateProject = useUpdateProject();

    if (
        projectQuery.isPending ||
        currentUserQuery.isPending
    ) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 w-48 rounded bg-muted" />
                <div className="h-64 rounded-xl bg-muted" />
            </div>
        );
    }

    if (projectQuery.isError || currentUserQuery.isError) {
        return (
            <div className="space-y-4 py-16 text-center">
                <h2 className="text-xl font-semibold">
                    Unable to load project settings
                </h2>

                <p className="text-sm text-muted-foreground">
                    Please try again.
                </p>

                <Button asChild variant="outline">
                    <Link to="/projects">
                        Back to Projects
                    </Link>
                </Button>
            </div>
        );
    }

    const project = projectQuery.data.data;
    const currentUser = currentUserQuery.data;

    const isOwner = project.ownerId === currentUser.id;

    const isAdmin = project.members.some(
        (member) =>
            member.userId === currentUser.id &&
            member.role === "ADMIN",
    );

    const canManageProject = isOwner || isAdmin;

    const handleSubmit = async (
        values: UpdateProjectFormValues,
    ) => {
        await updateProject.mutateAsync({
            id: project.id,
            data: values,
        });

        navigate(`/projects/${project.id}`);
    };

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="-ml-3"
                >
                    <Link to={`/projects/${project.id}`}>
                        <ArrowLeft className="mr-2 size-4" />
                        Back to Project
                    </Link>
                </Button>

                <div>
                    <div className="flex items-center gap-2">
                        <Settings className="size-5 text-muted-foreground" />

                        <h1 className="text-2xl font-bold">
                            Project Settings
                        </h1>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Manage settings for {project.name}.
                    </p>
                </div>
            </div>

            {!canManageProject && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                    You have read-only access to this project.
                </div>
            )}

            <div className="rounded-xl border p-6">
                <ProjectSettingsForm
                    key={project.id}
                    project={project}
                    onSubmit={handleSubmit}
                    isSubmitting={updateProject.isPending}
                    canEdit={canManageProject}
                />

                {isOwner && (
                    <div className="rounded-xl border border-destructive/30 p-6">
                        <div className="space-y-2">
                            <h2 className="font-semibold text-destructive">
                                Danger Zone
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Permanently delete this project and its
                                associated data.
                            </p>
                        </div>

                        <div className="mt-5">
                            <DeleteProjectDialog
                                projectId={project.id}
                                projectName={project.name}
                            />
                        </div>
                    </div>
                )}

                {updateProject.isError && (
                    <p
                        role="alert"
                        className="mt-4 text-sm text-destructive"
                    >
                        {updateProject.error.message ||
                            "Unable to update project."}
                    </p>
                )}
            </div>
        </div>
    );
}
