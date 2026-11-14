
import { useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { CreateProjectForm } from "./CreateProjectForm";
import { useCreateProject } from "../hooks/useCreateProject";

import type {
    CreateProjectFormValues,
} from "../schemas/project.schema";

interface CreateProjectDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function CreateProjectDialog({
    open: controlledOpen,
    onOpenChange,
}: CreateProjectDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const createProject = useCreateProject();

    const isControlled = controlledOpen !== undefined;

    const open = isControlled
        ? controlledOpen
        : internalOpen;

    const handleOpenChange = (nextOpen: boolean) => {
        if (createProject.isPending) return;

        if (!isControlled) {
            setInternalOpen(nextOpen);
        }

        onOpenChange?.(nextOpen);
    };

    const handleSubmit = async (
        values: CreateProjectFormValues,
    ) => {
        try {
            await createProject.mutateAsync(values);
            handleOpenChange(false);
        } catch {
            // Error is handled below.
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button>
                        New Project
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Create Project
                    </DialogTitle>

                    <DialogDescription>
                        Create a new project to organize
                        your team's work.
                    </DialogDescription>
                </DialogHeader>

                {createProject.isError && (
                    <div
                        role="alert"
                        className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                        {createProject.error.message ||
                            "Unable to create project. Please try again."}
                    </div>
                )}

                <CreateProjectForm
                    onSubmit={handleSubmit}
                    isSubmitting={createProject.isPending}
                />
            </DialogContent>
        </Dialog>
    );
}
