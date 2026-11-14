
import type { DashboardActivity } from "../types/dashboard.types";

interface RecentActivitiesProps {
    activities: DashboardActivity[];
    limit?: number;
}

function formatAction(action: string): string {
    const actionLabels: Record<string, string> = {
        PROJECT_CREATED: "created a project",
        PROJECT_UPDATED: "updated a project",
        PROJECT_DELETED: "deleted a project",
        MEMBER_ADDED: "added a member",
        MEMBER_REMOVED: "removed a member",
        TASK_CREATED: "created a task",
        TASK_UPDATED: "updated a task",
        TASK_DELETED: "deleted a task",
        TASK_COMPLETED: "completed a task",
        TASK_MOVED: "moved a task",
        COMMENT_CREATED: "added a comment",
        COMMENT_UPDATED: "updated a comment",
        COMMENT_DELETED: "deleted a comment",
    };

    return (
        actionLabels[action.toUpperCase()] ??
        action.toLowerCase().replaceAll("_", " ")
    );
}

function formatDate(date: string): string {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Unknown date";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(parsedDate);
}

export function RecentActivities({
    activities,
    limit = 5,
}: RecentActivitiesProps) {
    const visibleActivities = activities.slice(0, limit);

    return (
        <section className="rounded-xl border bg-card p-5">
            <div className="mb-5">
                <h2 className="text-lg font-semibold">
                    Recent Activities
                </h2>

                <p className="text-sm text-muted-foreground">
                    Latest updates across your projects.
                </p>
            </div>

            {visibleActivities.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                        No recent activities found.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {visibleActivities.map((activity) => (
                        <div
                            key={activity.id}
                            className="flex gap-3"
                        >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                {activity.actor?.name
                                    ?.charAt(0)
                                    .toUpperCase() ?? "?"}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm leading-6">
                                    <span className="font-medium">
                                        {activity.actor?.name ?? "Unknown user"}
                                    </span>{" "}

                                    <span className="text-muted-foreground">
                                        {formatAction(activity.action)}
                                    </span>
                                </p>

                                {activity.task && (
                                    <p className="mt-1 truncate text-sm font-medium">
                                        {activity.task.title}
                                    </p>
                                )}

                                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                    <span>
                                        {activity.project.name}
                                    </span>

                                    <span aria-hidden="true">·</span>

                                    <time dateTime={activity.createdAt}>
                                        {formatDate(activity.createdAt)}
                                    </time>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
