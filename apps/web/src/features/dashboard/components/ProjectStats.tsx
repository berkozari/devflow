
import {
    FolderKanban,
    FolderCheck,
    ListTodo,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
} from "lucide-react";

import type {
    LucideIcon,
} from "lucide-react";

import type {
    DashboardStatistics,
} from "../types/dashboard.types";

interface ProjectStatsProps {
    statistics: DashboardStatistics;
}

interface StatItem {
    label: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
    color: string;
}

export function ProjectStats({
    statistics,
}: ProjectStatsProps) {
    const stats: StatItem[] = [
        {
            label: "Total Projects",
            value: statistics.totalProjects,
            description: `${statistics.activeProjects} active projects`,
            icon: FolderKanban,
            color: "text-blue-600 bg-blue-100",
        },
        {
            label: "Completed Projects",
            value: statistics.completedProjects,
            description: "Successfully completed",
            icon: FolderCheck,
            color: "text-green-600 bg-green-100",
        },
        {
            label: "Total Tasks",
            value: statistics.totalTasks,
            description: `${statistics.unassignedTasks} unassigned`,
            icon: ListTodo,
            color: "text-violet-600 bg-violet-100",
        },
        {
            label: "Completed Tasks",
            value: statistics.completedTasks,
            description: "Successfully completed tasks",
            icon: CheckCircle2,
            color: "text-green-600 bg-green-100",
        },
        {
            label: "Overdue Tasks",
            value: statistics.overdueTasks,
            description: "Tasks past their due date",
            icon: AlertCircle,
            color: "text-red-600 bg-red-100",
        },
        {
            label: "Completion Rate",
            value: `${statistics.completionRate}%`,
            description: "Overall task completion",
            icon: TrendingUp,
            color: "text-orange-600 bg-orange-100",
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                    <div
                        key={stat.label}
                        className="rounded-xl border bg-card p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </p>

                            <div
                                className={`rounded-lg p-2 ${stat.color}`}
                            >
                                <Icon className="size-4" />
                            </div>
                        </div>

                        <p className="mt-3 text-3xl font-bold tracking-tight">
                            {stat.value}
                        </p>

                        <p className="mt-2 text-xs text-muted-foreground">
                            {stat.description}
                        </p>

                        {stat.label === "Completion Rate" && (
                            <div
                                className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
                                role="progressbar"
                                aria-label="Task completion rate"
                                aria-valuenow={Math.min(
                                    100,
                                    Math.max(0, statistics.completionRate),
                                )}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            >
                                <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            Math.max(0, statistics.completionRate),
                                        )}%`,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
