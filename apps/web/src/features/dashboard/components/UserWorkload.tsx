
import { Users, UserRound } from "lucide-react";

import type { DashboardWorkload } from "../types/dashboard.types";

interface UserWorkloadProps {
    workload: DashboardWorkload[];
    limit?: number;
}

const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700",
];

export function UserWorkload({
    workload,
    limit = 5,
}: UserWorkloadProps) {
    const sortedWorkload = [...workload]
        .sort((a, b) => b.totalTasks - a.totalTasks)
        .slice(0, limit);

    const maxTasks = Math.max(
        ...sortedWorkload.map((item) => item.totalTasks),
        0,
    );

    const totalAssignedTasks = workload.reduce(
        (total, item) => total + item.totalTasks,
        0,
    );

    return (
        <section className="rounded-xl border bg-card p-5">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        User Workload
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Task distribution across team members.
                    </p>
                </div>

                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="size-5" />
                </div>
            </div>

            {sortedWorkload.length === 0 ? (
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
                    <UserRound className="size-8 text-muted-foreground" />

                    <p className="text-sm font-medium">
                        No workload data
                    </p>

                    <p className="text-xs text-muted-foreground">
                        Assigned tasks will appear here.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mb-5 flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="text-sm text-muted-foreground">
                            Total assigned tasks
                        </span>

                        <span className="text-xl font-bold">
                            {totalAssignedTasks}
                        </span>
                    </div>

                    <div className="space-y-5">
                        {sortedWorkload.map((item, index) => {
                            const percentage =
                                maxTasks > 0
                                    ? (item.totalTasks / maxTasks) * 100
                                    : 0;

                            const avatarColor =
                                AVATAR_COLORS[
                                index % AVATAR_COLORS.length
                                ];

                            return (
                                <div key={item.user.id}>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div
                                                className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor}`}
                                            >
                                                {item.user.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {item.user.name}
                                                </p>

                                                <p className="truncate text-xs text-muted-foreground">
                                                    {item.user.email}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="shrink-0 text-sm font-semibold">
                                            {item.totalTasks}
                                        </span>
                                    </div>

                                    <div
                                        className="h-2 overflow-hidden rounded-full bg-muted"
                                        role="progressbar"
                                        aria-label={`${item.user.name} task workload`}
                                        aria-valuenow={item.totalTasks}
                                        aria-valuemin={0}
                                        aria-valuemax={maxTasks}
                                    >
                                        <div
                                            className="h-full rounded-full bg-primary transition-all duration-300"
                                            style={{
                                                width: `${percentage}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
