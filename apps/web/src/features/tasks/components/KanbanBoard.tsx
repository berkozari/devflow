
import { useState } from "react";

import {
    DndContext,
    DragOverlay,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCorners,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core";

import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";

import type { Task, TaskStatus } from "../types/task.types";

const columns: {
    status: TaskStatus;
    title: string;
}[] = [
        { status: "TODO", title: "To Do" },
        { status: "IN_PROGRESS", title: "In Progress" },
        { status: "IN_REVIEW", title: "In Review" },
        { status: "DONE", title: "Done" },
    ];

interface KanbanBoardProps {
    tasks: Task[];
    onMoveTask: (
        taskId: string,
        status: TaskStatus,
        beforeTaskId: string | null,
    ) => void;
    onTaskClick?: (task: Task) => void;
    onAddTask?: (status: TaskStatus) => void;
    canDrag?: boolean;
    canDragTask?: (task: Task) => boolean;
    canAddTask?: boolean;
    isMoving?: boolean;
}

export function KanbanBoard({
    tasks,
    onMoveTask,
    onTaskClick,
    onAddTask,
    canDrag = false,
    canDragTask = () => true,
    canAddTask = true,
    isMoving = false,
}: KanbanBoardProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        if (!canDrag || isMoving) return;

        const task = tasks.find(
            (item) => item.id === event.active.id,
        );

        if (!task || !canDragTask(task)) return;

        setActiveTask(task);
    };

    const handleDragCancel = () => {
        setActiveTask(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveTask(null);

        if (!canDrag || isMoving) return;

        const { active, over } = event;

        if (!over) return;

        const task = tasks.find(
            (item) => item.id === active.id,
        );

        if (!task || !canDragTask(task)) return;

        const targetTask = tasks.find(
            (item) => item.id === over.id,
        );

        const targetColumn = columns.find(
            (column) => column.status === over.id,
        );

        const targetStatus =
            targetColumn?.status ?? targetTask?.status;

        if (!targetStatus) return;

        if (targetTask?.id === task.id) return;

        const targetColumnTasks = tasks
            .filter(
                (item) =>
                    item.status === targetStatus &&
                    item.id !== task.id,
            )
            .sort((a, b) => a.position - b.position);

        const targetIndex = targetTask
            ? targetColumnTasks.findIndex(
                (item) => item.id === targetTask.id,
            )
            : targetColumnTasks.length;

        const beforeTaskId =
            targetColumnTasks[targetIndex]?.id ?? null;

        // Aynı sütunda ve aynı konumdaysa gereksiz API isteği gönderme.
        if (
            task.status === targetStatus &&
            beforeTaskId === targetColumnTasks[
                targetColumnTasks.findIndex(
                    (item) => item.position > task.position,
                )
            ]?.id
        ) {
            return;
        }

        onMoveTask(
            task.id,
            targetStatus,
            beforeTaskId,
        );
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {columns.map((column) => (
                    <KanbanColumn
                        key={column.status}
                        status={column.status}
                        title={column.title}
                        tasks={tasks
                            .filter(
                                (task) => task.status === column.status,
                            )
                            .sort(
                                (a, b) => a.position - b.position,
                            )}
                        disabled={isMoving}
                        canDrag={canDrag}
                        canDragTask={canDragTask}
                        canAddTask={canAddTask}
                        onTaskClick={onTaskClick}
                        onAddTask={onAddTask}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeTask && (
                    <TaskCard
                        task={activeTask}
                        overlay
                        canDrag={false}
                    />
                )}
            </DragOverlay>
        </DndContext>
    );
}
