
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

import type {
    DashboardProjectProgress,
} from "../types/dashboard.types";

interface ProjectProgressChartProps {
    projects: DashboardProjectProgress[];
}

export function ProjectProgressChart({
    projects,
}: ProjectProgressChartProps) {
    const chartData = projects.map((project) => ({
        name: project.name,
        completionRate: project.completionRate,
        completedTasks: project.completedTasks,
        totalTasks: project.totalTasks,
    }));

    return (
        <section className="rounded-xl border bg-card p-5">
            <div className="mb-5">
                <h2 className="text-lg font-semibold">
                    Project Progress
                </h2>

                <p className="text-sm text-muted-foreground">
                    Completion rate across your projects.
                </p>
            </div>

            {chartData.length === 0 ? (
                <div className="flex min-h-64 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                        No project data available.
                    </p>
                </div>
            ) : (
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{
                                top: 5,
                                right: 20,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                            />

                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                            />

                            <YAxis
                                type="category"
                                dataKey="name"
                                width={110}
                                tick={{ fontSize: 12 }}
                            />

                            <Tooltip
                                formatter={(value) => [
                                    `${value}%`,
                                    "Completion",
                                ]}
                                labelFormatter={(label) =>
                                    `Project: ${label}`
                                }
                            />

                            <Bar
                                dataKey="completionRate"
                                fill="#3b82f6"
                                radius={[0, 6, 6, 0]}
                                barSize={22}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </section>
    );
}
