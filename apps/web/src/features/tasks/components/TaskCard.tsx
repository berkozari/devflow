
import {
    CalendarDays,
    UserRound,
    GripVertical,
} from "lucide-react";

import { useDraggable } from "@dnd-kit/core";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import type { Task, TaskPriority } from "../types/task.types";

interface TaskCardProps {
    task: Task;
    overlay?: boolean;
    canDrag?: boolean;
    onClick?: (task: Task) => void;
    now?: number;
}

const priorityConfig: Record<
    TaskPriority,
    { label: string; className: string }
> = {
    LOW: {
        label: "Low",
        className: "bg-slate-100 text-slate-700",
    },
    MEDIUM: {
        label: "Medium",
        className: "bg-blue-100 text-blue-700",
    },
    HIGH: {
        label: "High",
        className: "bg-orange-100 text-orange-700",
    },
    URGENT: {
        label: "Urgent",
        className: "bg-red-100 text-red-700",
    },
};

function formatDate(date: string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(date));
}

export function TaskCard({
    task,
    overlay = false,
    canDrag = false,
    onClick,
    now,
}: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: task.id,
        disabled: !canDrag || overlay,
    });

    const priority = priorityConfig[task.priority];

    const initials = task.assignee?.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const isOverdue =
        task.dueDate !== null &&
        now !== undefined &&
        new Date(task.dueDate).getTime() < now;

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

    return (
        <Card
            ref={setNodeRef}
            style={style}
            onClick={() => {
                if (!isDragging && !overlay) {
                    onClick?.(task);
                }
            }}
            className={`transition-shadow hover:shadow-md ${canDrag && !overlay
                ? "cursor-default"
                : "cursor-pointer"
                } ${isDragging ? "opacity-30" : ""} ${overlay ? "rotate-1 shadow-xl" : ""
                }`}
        >
            <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-5">
                        {task.title}
                    </h3>

                    {canDrag && !overlay && (
                        <button
                            ref={setActivatorNodeRef}
                            type="button"
                            {...attributes}
                            {...listeners}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Drag task: ${task.title}`}
                            className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                        >
                            <GripVertical className="size-4" />
                        </button>
                    )}
                </div>

                {task.description && (
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {task.description}
                    </p>
                )}

                <Badge
                    variant="secondary"
                    className={priority.className}
                >
                    {priority.label}
                </Badge>

                <div className="flex items-center justify-between gap-2 border-t pt-3">
                    {task.assignee ? (
                        <div className="flex min-w-0 items-center gap-2">
                            <Avatar className="size-7">
                                <AvatarFallback className="text-xs">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            <span className="truncate text-xs text-muted-foreground">
                                {task.assignee.name}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserRound className="size-3" />
                            Unassigned
                        </div>
                    )}

                    {task.dueDate && (
                        <div
                            className={`flex shrink-0 items-center gap-1 text-xs ${isOverdue
                                ? "text-destructive"
                                : "text-muted-foreground"
                                }`}
                        >
                            <CalendarDays className="size-3" />
                            {formatDate(task.dueDate)}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
