
import { useEffect, useState, type FormEvent } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type {
    Task,
    TaskUser,
    TaskStatus,
    TaskPriority,
    CreateTaskPayload,
    UpdateTaskPayload,
} from "../types/task.types";

interface TaskFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task?: Task | null;
    defaultStatus?: TaskStatus;
    assignees?: TaskUser[];
    onSubmit: (
        data: CreateTaskPayload | UpdateTaskPayload,
    ) => void;
    isPending: boolean;
    canEditAllFields?: boolean;
}

export function TaskFormModal({
    open,
    onOpenChange,
    task,
    defaultStatus = "TODO",
    assignees = [],
    onSubmit,
    isPending,
    canEditAllFields = true,
}: TaskFormModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<TaskStatus>(defaultStatus);
    const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
    const [assigneeId, setAssigneeId] = useState("");
    const [dueDate, setDueDate] = useState("");

    useEffect(() => {
        if (!open) return;

        setTitle(task?.title ?? "");
        setDescription(task?.description ?? "");
        setStatus(task?.status ?? defaultStatus);
        setPriority(task?.priority ?? "MEDIUM");
        setAssigneeId(task?.assigneeId ?? "");
        setDueDate(task?.dueDate?.slice(0, 10) ?? "");
    }, [open, task, defaultStatus]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isPending) return;

        if (task && !canEditAllFields) {
            onSubmit({
                status,
            });

            return;
        }

        const normalizedTitle = title.trim();

        if (
            !task &&
            (normalizedTitle.length < 2 ||
                normalizedTitle.length > 150)
        ) {
            return;
        }

        if (
            task &&
            (normalizedTitle.length < 2 ||
                normalizedTitle.length > 150)
        ) {
            return;
        }

        const data: CreateTaskPayload = {
            title: normalizedTitle,
            description: description.trim() || null,
            status,
            priority,
            assigneeId: assigneeId || null,
            dueDate: dueDate
                ? new Date(`${dueDate}T12:00:00.000Z`).toISOString()
                : null,
        };

        onSubmit(data);
    };

    const isEditing = Boolean(task);

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!isPending) onOpenChange(value);
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? "Edit task" : "Create task"}
                        </DialogTitle>

                        <DialogDescription>
                            {isEditing
                                ? "Update the task information."
                                : "Add a new task to your project."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-5">
                        <div className="space-y-2">
                            <Label htmlFor="task-title">Title</Label>

                            <Input
                                id="task-title"
                                value={title}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                placeholder="Enter task title"
                                minLength={2}
                                maxLength={150}
                                required
                                disabled={
                                    isPending ||
                                    (isEditing && !canEditAllFields)
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="task-description">
                                Description
                            </Label>

                            <Textarea
                                id="task-description"
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="Describe the task..."
                                maxLength={5000}
                                disabled={
                                    isPending ||
                                    (isEditing && !canEditAllFields)
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="task-status">Status</Label>

                                <select
                                    id="task-status"
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(
                                            event.target.value as TaskStatus
                                        )
                                    }
                                    disabled={isPending}
                                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                >
                                    <option value="TODO">To Do</option>
                                    <option value="IN_PROGRESS">
                                        In Progress
                                    </option>
                                    <option value="IN_REVIEW">
                                        In Review
                                    </option>
                                    <option value="DONE">Done</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="task-priority">
                                    Priority
                                </Label>

                                <select
                                    id="task-priority"
                                    value={priority}
                                    onChange={(event) =>
                                        setPriority(
                                            event.target.value as TaskPriority
                                        )
                                    }
                                    disabled={
                                        isPending ||
                                        (isEditing && !canEditAllFields)
                                    }
                                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="task-assignee">Assignee</Label>

                            <select
                                id="task-assignee"
                                value={assigneeId}
                                onChange={(event) =>
                                    setAssigneeId(event.target.value)
                                }
                                disabled={
                                    isPending ||
                                    (isEditing && !canEditAllFields)
                                }
                                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            >
                                <option value="">Unassigned</option>

                                {assignees.map((user) => (
                                    <option
                                        key={user.id}
                                        value={user.id}
                                    >
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="task-due-date">
                                Due date
                            </Label>

                            <Input
                                id="task-due-date"
                                type="date"
                                value={dueDate}
                                onChange={(event) =>
                                    setDueDate(event.target.value)
                                }
                                disabled={
                                    isPending ||
                                    (isEditing && !canEditAllFields)
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={
                                isPending ||
                                (canEditAllFields &&
                                    (title.trim().length < 2 ||
                                        title.trim().length > 150))
                            }
                        >
                            {isPending
                                ? "Saving..."
                                : isEditing
                                    ? "Save changes"
                                    : "Create task"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
