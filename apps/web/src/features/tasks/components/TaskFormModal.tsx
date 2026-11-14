
import {
    useForm,
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

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
    CreateTaskPayload,
    UpdateTaskPayload,
} from "../types/task.types";

import {
    taskFormSchema,
} from "../schemas/task-form.schema";

import type {
    TaskFormValues,
} from "../schemas/task-form.schema";

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

interface TaskFormContentProps {
    task?: Task | null;
    defaultStatus: TaskStatus;
    assignees: TaskUser[];
    onSubmit: (
        data: CreateTaskPayload | UpdateTaskPayload,
    ) => void;
    isPending: boolean;
    canEditAllFields: boolean;
    onOpenChange: (open: boolean) => void;
}

function TaskFormContent({
    task,
    defaultStatus,
    assignees,
    onSubmit,
    isPending,
    canEditAllFields,
    onOpenChange,
}: TaskFormContentProps) {
    const isEditing = Boolean(task);

    const {
        register,
        handleSubmit,
        formState: {
            errors,
        },
    } = useForm<TaskFormValues>({
        resolver: zodResolver(taskFormSchema),
        defaultValues: {
            title: task?.title ?? "",
            description: task?.description ?? "",
            status: task?.status ?? defaultStatus,
            priority: task?.priority ?? "MEDIUM",
            assigneeId: task?.assigneeId ?? "",
            dueDate: task?.dueDate?.slice(0, 10) ?? "",
        },
    });

    function handleFormSubmit(data: TaskFormValues) {
        if (isPending) return;

        // Users without full edit permission can only update status.
        if (task && !canEditAllFields) {
            onSubmit({
                status: data.status,
            });

            return;
        }

        const payload: CreateTaskPayload = {
            title: data.title.trim(),
            description: data.description.trim() || null,
            status: data.status,
            priority: data.priority,
            assigneeId: data.assigneeId || null,
            dueDate: data.dueDate
                ? new Date(
                    `${data.dueDate}T12:00:00.000Z`,
                ).toISOString()
                : null,
        };

        onSubmit(payload);
    }

    const isFormDisabled = isPending || (
        isEditing && !canEditAllFields
    );

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
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
                    <Label htmlFor="task-title">
                        Title
                    </Label>

                    <Input
                        id="task-title"
                        placeholder="Enter task title"
                        maxLength={150}
                        disabled={isFormDisabled}
                        {...register("title")}
                    />

                    {errors.title && (
                        <p className="text-sm text-destructive">
                            {errors.title.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="task-description">
                        Description
                    </Label>

                    <Textarea
                        id="task-description"
                        placeholder="Describe the task..."
                        maxLength={5000}
                        disabled={isFormDisabled}
                        {...register("description")}
                    />

                    {errors.description && (
                        <p className="text-sm text-destructive">
                            {errors.description.message}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="task-status">
                            Status
                        </Label>

                        <select
                            id="task-status"
                            disabled={isPending}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            {...register("status")}
                        >
                            <option value="TODO">
                                To Do
                            </option>

                            <option value="IN_PROGRESS">
                                In Progress
                            </option>

                            <option value="IN_REVIEW">
                                In Review
                            </option>

                            <option value="DONE">
                                Done
                            </option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="task-priority">
                            Priority
                        </Label>

                        <select
                            id="task-priority"
                            disabled={isFormDisabled}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            {...register("priority")}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="task-assignee">
                        Assignee
                    </Label>

                    <select
                        id="task-assignee"
                        disabled={isFormDisabled}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        {...register("assigneeId")}
                    >
                        <option value="">
                            Unassigned
                        </option>

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
                        disabled={isFormDisabled}
                        {...register("dueDate")}
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
                    disabled={isPending}
                >
                    {isPending
                        ? "Saving..."
                        : isEditing
                            ? "Save changes"
                            : "Create task"}
                </Button>
            </DialogFooter>
        </form>
    );
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
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!isPending) {
                    onOpenChange(value);
                }
            }}
        >
            <DialogContent className="sm:max-w-lg">
                {open && (
                    <TaskFormContent
                        task={task}
                        defaultStatus={defaultStatus}
                        assignees={assignees}
                        onSubmit={onSubmit}
                        isPending={isPending}
                        canEditAllFields={canEditAllFields}
                        onOpenChange={onOpenChange}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
