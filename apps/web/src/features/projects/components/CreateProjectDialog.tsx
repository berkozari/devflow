
import { useState } from "react";
import { Plus } from "lucide-react";

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

export function CreateProjectDialog() {
    const [open, setOpen] = useState(false);

    const createProject = useCreateProject();

    const handleSubmit = async (
        values: CreateProjectFormValues,
    ) => {
        try {
            await createProject.mutateAsync(values);

            setOpen(false);
        } catch {
            // Error is handled below.
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!createProject.isPending) {
                    setOpen(nextOpen);
                }
            }}
        >
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 size-4" />
                    New Project
                </Button>
            </DialogTrigger>

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
