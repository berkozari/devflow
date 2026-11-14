
import {
    CalendarDays,
    UserRound,
    Pencil,
    Trash2,
} from "lucide-react";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import type { Task } from "../types/task.types";

interface TaskDetailDrawerProps {
    task: Task | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

const priorityConfig = {
    LOW: "bg-slate-100 text-slate-700",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
};

const statusLabels: Record<Task["status"], string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    DONE: "Done",
};

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function TaskDetailDrawer({
    task,
    open,
    onOpenChange,
    onEdit,
    onDelete,
    canEdit = false,
    canDelete = false,
}: TaskDetailDrawerProps) {
    if (!task) return null;

    const formattedDate = task.dueDate
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "long",
        }).format(new Date(task.dueDate))
        : null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="overflow-y-auto sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>{task.title}</SheetTitle>

                    <SheetDescription>
                        Task details and information
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 px-4 pb-6">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                            {statusLabels[task.status]}
                        </Badge>

                        <Badge
                            variant="secondary"
                            className={priorityConfig[task.priority]}
                        >
                            {task.priority}
                        </Badge>
                    </div>

                    <div>
                        <h3 className="mb-2 text-sm font-semibold">
                            Description
                        </h3>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {task.description || "No description provided."}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="mb-2 text-sm font-semibold">
                                Assignee
                            </h3>

                            {task.assignee ? (
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarFallback>
                                            {getInitials(task.assignee.name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div>
                                        <p className="text-sm font-medium">
                                            {task.assignee.name}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {task.assignee.email}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <UserRound className="size-4" />
                                    Unassigned
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="mb-2 text-sm font-semibold">
                                Creator
                            </h3>

                            <p className="text-sm">
                                {task.creator.name}
                            </p>

                            <p className="text-xs text-muted-foreground">
                                {task.creator.email}
                            </p>
                        </div>

                        <div>
                            <h3 className="mb-2 text-sm font-semibold">
                                Due date
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarDays className="size-4" />
                                {formattedDate ?? "No due date"}
                            </div>
                        </div>

                        <div>
                            <h3 className="mb-2 text-sm font-semibold">
                                Created
                            </h3>

                            <p className="text-sm text-muted-foreground">
                                {new Date(task.createdAt).toLocaleString()}
                            </p>
                        </div>

                        <div>
                            <h3 className="mb-2 text-sm font-semibold">
                                Last updated
                            </h3>

                            <p className="text-sm text-muted-foreground">
                                {new Date(task.updatedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {(canEdit || canDelete) && (
                        <div className="flex gap-2 border-t pt-5">
                            {canEdit && (
                                <Button
                                    className="flex-1"
                                    onClick={() => onEdit(task)}
                                >
                                    <Pencil className="mr-2 size-4" />
                                    Edit task
                                </Button>
                            )}

                            {canDelete && (
                                <Button
                                    variant="destructive"
                                    onClick={() => onDelete(task)}
                                >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
