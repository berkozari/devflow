
import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from "recharts";

import type { DashboardTaskStatus } from "../types/dashboard.types";

interface TaskCompletionChartProps {
    tasksByStatus: DashboardTaskStatus[];
}

const CHART_COLORS = [
    "#64748b",
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
];

function formatStatus(status: string): string {
    return status
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function TaskCompletionChart({
    tasksByStatus,
}: TaskCompletionChartProps) {
    const chartData = tasksByStatus.map((item) => ({
        name: formatStatus(item.status),
        value: item._count._all,
    }));

    const totalTasks = chartData.reduce(
        (total, item) => total + item.value,
        0,
    );

    return (
        <section className="rounded-xl border bg-card p-5">
            <div className="mb-5">
                <h2 className="text-lg font-semibold">
                    Task Completion
                </h2>

                <p className="text-sm text-muted-foreground">
                    Distribution of tasks by status.
                </p>
            </div>

            {totalTasks === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium">
                        No task data available
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Task statistics will appear here.
                    </p>
                </div>
            ) : (
                <>
                    <div className="relative h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="45%"
                                    innerRadius="58%"
                                    outerRadius="78%"
                                    paddingAngle={3}
                                    strokeWidth={0}
                                >
                                    {chartData.map((item, index) => (
                                        <Cell
                                            key={item.name}
                                            fill={
                                                CHART_COLORS[
                                                index % CHART_COLORS.length
                                                ]
                                            }
                                        />
                                    ))}
                                </Pie>

                                <Tooltip
                                    formatter={(value) => [
                                        `${value} tasks`,
                                        "Tasks",
                                    ]}
                                />

                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    iconSize={8}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-8">
                            <div className="text-center">
                                <p className="text-3xl font-bold">
                                    {totalTasks}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                    Total Tasks
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        {chartData.map((item, index) => {
                            const percentage =
                                (item.value / totalTasks) * 100;

                            return (
                                <div
                                    key={item.name}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="size-2.5 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    CHART_COLORS[
                                                    index % CHART_COLORS.length
                                                    ],
                                            }}
                                        />

                                        <span className="text-muted-foreground">
                                            {item.name}
                                        </span>
                                    </div>

                                    <span className="font-medium">
                                        {item.value} (
                                        {percentage.toFixed(1)}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
