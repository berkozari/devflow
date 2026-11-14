
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { useDeleteProject } from "../hooks/useDeleteProject";

interface DeleteProjectDialogProps {
    projectId: string;
    projectName: string;
}

export function DeleteProjectDialog({
    projectId,
    projectName,
}: DeleteProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const deleteProject = useDeleteProject();

    const handleDelete = async () => {
        try {
            await deleteProject.mutateAsync(projectId);

            setOpen(false);

            navigate("/projects", { replace: true });
        } catch {
            // Error is displayed below.
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!deleteProject.isPending) {
                    setOpen(nextOpen);
                }
            }}
        >
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 className="mr-2 size-4" />
                    Delete Project
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Delete Project?
                    </DialogTitle>

                    <DialogDescription>
                        Are you sure you want to delete{" "}
                        <strong>{projectName}</strong>?

                        This action cannot be undone.
                        All associated tasks, comments and
                        activities will also be deleted.
                    </DialogDescription>
                </DialogHeader>

                {deleteProject.isError && (
                    <p
                        role="alert"
                        className="text-sm text-destructive"
                    >
                        {deleteProject.error.message ||
                            "Unable to delete project."}
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        disabled={deleteProject.isPending}
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="destructive"
                        disabled={deleteProject.isPending}
                        onClick={handleDelete}
                    >
                        {deleteProject.isPending
                            ? "Deleting..."
                            : "Delete Project"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
