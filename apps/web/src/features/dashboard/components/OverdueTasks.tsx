
import { AlertCircle, CalendarDays, UserRound } from "lucide-react";

import type { DashboardOverdueTask } from "../types/dashboard.types";

interface OverdueTasksProps {
    tasks: DashboardOverdueTask[];
    limit?: number;
}

const priorityStyles: Record<string, string> = {
    LOW: "bg-slate-100 text-slate-700",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
};

function formatDate(date: string): string {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Unknown date";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(parsedDate);
}

function getDaysOverdue(date: string): number {
    const dueDate = new Date(date);
    const today = new Date();

    if (Number.isNaN(dueDate.getTime())) {
        return 0;
    }

    const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
    );

    const dueDateStart = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate(),
    );

    return Math.max(
        0,
        Math.floor(
            (todayStart.getTime() - dueDateStart.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
    );
}

export function OverdueTasks({
    tasks,
    limit = 5,
}: OverdueTasksProps) {
    const visibleTasks = tasks.slice(0, limit);

    return (
        <section className="rounded-xl border bg-card p-5">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        Overdue Tasks
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Tasks that passed their deadlines.
                    </p>
                </div>

                <div className="flex size-9 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertCircle className="size-5" />
                </div>
            </div>

            {visibleTasks.length === 0 ? (
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <AlertCircle className="size-5" />
                    </div>

                    <p className="text-sm font-medium">
                        No overdue tasks
                    </p>

                    <p className="text-xs text-muted-foreground">
                        All tasks are on schedule.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleTasks.map((task) => {
                        const priority =
                            task.priority.toUpperCase();

                        return (
                            <div
                                key={task.id}
                                className="rounded-lg border p-3 transition-colors hover:bg-muted/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {task.title}
                                        </p>

                                        <p className="mt-1 truncate text-xs text-muted-foreground">
                                            {task.project.name}
                                        </p>
                                    </div>

                                    <span
                                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${priorityStyles[priority] ??
                                            "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        {priority}
                                    </span>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5 text-xs text-red-600">
                                        <CalendarDays className="size-3.5" />

                                        <span>
                                            {formatDate(task.dueDate)}
                                        </span>

                                        <span>
                                            ({getDaysOverdue(task.dueDate)} days overdue)
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <UserRound className="size-3.5" />

                                        <span className="max-w-28 truncate">
                                            {task.assignee?.name ??
                                                "Unassigned"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
