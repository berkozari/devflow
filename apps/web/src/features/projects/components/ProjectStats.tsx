
import { ListTodo, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { ProjectDetail } from "../types/project.types";

interface ProjectStatsProps {
    project: ProjectDetail;
}

export function ProjectStats({
    project,
}: ProjectStatsProps) {
    const stats = [
        {
            label: "Total Tasks",
            value: project._count.tasks,
            icon: ListTodo,
            description: "Tasks in this project",
        },
        {
            label: "Team Members",
            value: project.members.length,
            icon: Users,
            description: "People working on this project",
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                    <Card key={stat.label}>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Icon className="size-5 text-primary" />
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">
                                    {stat.label}
                                </p>

                                <p className="text-2xl font-bold">
                                    {stat.value}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                    {stat.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
