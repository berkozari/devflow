
import { useState } from "react";

import { DashboardFilters } from "../../features/dashboard/components/DashboardFilters";
import { RecentActivities } from "../../features/dashboard/components/RecentActivities";
import { OverdueTasks } from "../../features/dashboard/components/OverdueTasks";
import { UserWorkload } from "../../features/dashboard/components/UserWorkload";
import { TaskCompletionChart } from "../../features/dashboard/components/TaskCompletionChart";
import { ProjectProgressChart } from "../../features/dashboard/components/ProjectProgressChart";
import { ProjectStats } from "../../features/dashboard/components/ProjectStats";

import { useDashboard } from "../../features/dashboard/hooks/useDashboard";

import type {
    DashboardFilters as DashboardFiltersType,
} from "../../features/dashboard/types/dashboard.types";

export function DashboardPage() {
    const [filters, setFilters] = useState<DashboardFiltersType>({});

    const {
        overview,
        overdueTasks,
        workload,
        activities,
        isLoading,
        isError,
        refetch,
    } = useDashboard(filters);

    const projects = overview?.projectProgress.map((project) => ({
        id: project.id,
        name: project.name,
    })) ?? [];

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="h-24 animate-pulse rounded-xl bg-muted" />
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="h-64 animate-pulse rounded-xl bg-muted" />
                    <div className="h-64 animate-pulse rounded-xl bg-muted" />
                </div>
            </div>
        );
    }

    if (isError || !overview) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <h2 className="text-lg font-semibold">
                    Failed to load dashboard
                </h2>

                <p className="text-sm text-muted-foreground">
                    Something went wrong while loading dashboard data.
                </p>

                <button
                    type="button"
                    onClick={() => void refetch()}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <header>
                <h1 className="text-2xl font-bold">
                    Dashboard
                </h1>

                <p className="text-sm text-muted-foreground">
                    Overview of your projects and tasks.
                </p>
            </header>

            <DashboardFilters
                filters={filters}
                projects={projects}
                onChange={setFilters}
            />

            <ProjectStats statistics={overview.statistics} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <OverdueTasks tasks={overdueTasks} />
                <RecentActivities activities={activities} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <UserWorkload workload={workload} />

                <TaskCompletionChart
                    tasksByStatus={overview.tasksByStatus}
                />
            </div>

            <ProjectProgressChart
                projects={overview.projectProgress}
            />
        </div>
    );
}
