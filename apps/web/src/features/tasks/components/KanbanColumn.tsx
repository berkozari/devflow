
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

import { Button } from "@/components/ui/button";

import { TaskCard } from "./TaskCard";

import type { Task, TaskStatus } from "../types/task.types";

interface KanbanColumnProps {
    title: string;
    status: TaskStatus;
    tasks: Task[];
    disabled?: boolean;
    canDrag?: boolean;
    canDragTask?: (task: Task) => boolean;
    canAddTask?: boolean;
    onTaskClick?: (task: Task) => void;
    onAddTask?: (status: TaskStatus) => void;
}

export function KanbanColumn({
    title,
    status,
    tasks,
    disabled = false,
    canDrag = false,
    canDragTask = () => true,
    canAddTask = true,
    onTaskClick,
    onAddTask,
}: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
        disabled: disabled || !canDrag,
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex min-h-[500px] min-w-[280px] flex-1 flex-col rounded-xl transition-colors ${isOver ? "bg-primary/10" : "bg-muted/40"
                }`}
        >
            <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{title}</h3>

                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                        {tasks.length}
                    </span>
                </div>

                {canAddTask && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={disabled}
                        aria-label={`Add task to ${title}`}
                        onClick={() => onAddTask?.(status)}
                    >
                        <Plus className="size-4" />
                    </Button>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-3">
                {tasks.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-6">
                        <p className="text-center text-sm text-muted-foreground">
                            No tasks yet
                        </p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            canDrag={
                                canDrag &&
                                !disabled &&
                                canDragTask(task)
                            }
                            onClick={onTaskClick}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
