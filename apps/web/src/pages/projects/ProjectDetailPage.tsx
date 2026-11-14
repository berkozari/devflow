
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { useProject } from "@/features/projects/hooks/useProject";
import { useAuth } from "@/features/auth/hooks/useAuth";

import { ProjectHeader } from "@/features/projects/components/ProjectHeader";
import { ProjectStats } from "@/features/projects/components/ProjectStats";
import { ProjectMembers } from "@/features/projects/components/ProjectMembers";

import { KanbanBoard } from "@/features/tasks/components/KanbanBoard";
import { TaskFilters } from "@/features/tasks/components/TaskFilters";
import { TaskFormModal } from "@/features/tasks/components/TaskFormModal";
import { TaskDetailDrawer } from "@/features/tasks/components/TaskDetailDrawer";

import { useTasks } from "@/features/tasks/hooks/useTasks";
import { useCreateTask } from "@/features/tasks/hooks/useCreateTask";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask";
import { useMoveTask } from "@/features/tasks/hooks/useMoveTask";
import { useDeleteTask } from "@/features/tasks/hooks/useDeleteTask";

import {
    canEditTask,
    canEditTaskFields,
    canDeleteTask as canDeleteTaskPermission,
} from "@/features/tasks/utils/task.permissions";

import type {
    Task,
    TaskFilters as TaskFiltersType,
    TaskStatus,
    CreateTaskPayload,
    UpdateTaskPayload,
} from "@/features/tasks/types/task.types";

export function ProjectDetailPage() {
    const { projectId } = useParams<{ projectId: string }>();

    const {
        data,
        isPending,
        isError,
        error,
        refetch,
    } = useProject(projectId ?? "");

    const { user, isLoading: isAuthLoading } = useAuth();

    const [filters, setFilters] = useState<TaskFiltersType>({
        page: 1,
        limit: 100,
    });

    const [formOpen, setFormOpen] = useState(false);

    const [defaultStatus, setDefaultStatus] =
        useState<TaskStatus>("TODO");

    const [editingTask, setEditingTask] =
        useState<Task | null>(null);

    const [selectedTask, setSelectedTask] =
        useState<Task | null>(null);

    const tasksQuery = useTasks(projectId ?? "", filters);

    const createMutation = useCreateTask(projectId ?? "");
    const updateMutation = useUpdateTask(projectId ?? "");
    const moveMutation = useMoveTask(projectId ?? "");
    const deleteMutation = useDeleteTask(projectId ?? "");

    if (isPending || isAuthLoading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 w-48 rounded bg-muted" />
                <div className="h-32 rounded-xl bg-muted" />
                <div className="h-24 rounded-xl bg-muted" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-4 py-16 text-center">
                <h2 className="text-xl font-semibold">
                    Unable to load project
                </h2>

                <p className="text-sm text-muted-foreground">
                    {error.message}
                </p>

                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                    >
                        Try again
                    </Button>

                    <Button asChild>
                        <Link to="/projects">
                            Back to Projects
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    const project = data.data;

    if (!user) {
        return (
            <div className="py-16 text-center">
                <p className="text-muted-foreground">
                    Unable to identify current user.
                </p>
            </div>
        );
    }

    const currentUserRole =
        project.ownerId === user.id
            ? "OWNER"
            : project.members.find(
                (member) => member.userId === user.id,
            )?.role ?? "MEMBER";

    const permissionContext = {
        role: currentUserRole,
        userId: user.id,
    };

    // OWNER, ADMIN ve MEMBER task oluşturabilir.
    const canAddTask = true;

    // Task bazlı drag izni.
    // MEMBER yalnızca kendisine atanmış task'leri taşıyabilir.
    const canDragTask = (task: Task) =>
        canEditTask(task, permissionContext);

    const tasks = tasksQuery.data?.data ?? [];

    const canEditSelectedTask = selectedTask
        ? canEditTask(selectedTask, permissionContext)
        : false;

    const canEditSelectedTaskFields = editingTask
        ? canEditTaskFields(permissionContext)
        : true;

    const canDeleteSelectedTask =
        canDeleteTaskPermission(currentUserRole);

    const handleAddTask = (status: TaskStatus) => {
        setEditingTask(null);
        setDefaultStatus(status);
        setFormOpen(true);
    };

    const handleEditTask = (task: Task) => {
        if (!canEditTask(task, permissionContext)) return;

        setSelectedTask(null);
        setEditingTask(task);
        setFormOpen(true);
    };

    const handleSubmitTask = (
        payload: CreateTaskPayload | UpdateTaskPayload,
    ) => {
        if (editingTask) {
            if (!canEditTask(editingTask, permissionContext)) {
                return;
            }

            const updatePayload: UpdateTaskPayload =
                canEditTaskFields(permissionContext)
                    ? payload as UpdateTaskPayload
                    : {
                        status: (payload as UpdateTaskPayload).status,
                    };

            updateMutation.mutate(
                {
                    taskId: editingTask.id,
                    data: updatePayload,
                },
                {
                    onSuccess: () => {
                        setFormOpen(false);
                        setEditingTask(null);
                    },
                },
            );

            return;
        }

        createMutation.mutate(
            {
                ...payload,
                status: payload.status ?? defaultStatus,
            } as CreateTaskPayload,
            {
                onSuccess: () => {
                    setFormOpen(false);
                },
            },
        );
    };

    const handleMoveTask = (
        taskId: string,
        status: TaskStatus,
        beforeTaskId: string | null,
    ) => {
        const task = tasks.find(
            (item) => item.id === taskId,
        );

        if (!task) return;

        if (!canDragTask(task)) return;

        moveMutation.mutate({
            taskId,
            data: {
                status,
                beforeTaskId,
            },
        });
    };

    const handleDeleteTask = (task: Task) => {
        if (!canDeleteTaskPermission(currentUserRole)) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete "${task.title}"?`,
        );

        if (!confirmed) return;

        deleteMutation.mutate(
            { taskId: task.id },
            {
                onSuccess: () => {
                    setSelectedTask(null);
                },
            },
        );
    };

    return (
        <div className="space-y-8">
            <ProjectHeader project={project} />

            <ProjectStats project={project} />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <div className="rounded-xl border p-6">
                        <h2 className="font-semibold">
                            Project Overview
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {project.description ||
                                "No project description available."}
                        </p>
                    </div>
                </div>

                <ProjectMembers
                    projectId={project.id}
                    currentUserId={user.id}
                    currentUserRole={currentUserRole}
                />
            </div>

            <section className="space-y-5">
                <div>
                    <h2 className="text-xl font-semibold">
                        Project Tasks
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage and track your project tasks.
                    </p>
                </div>

                <TaskFilters
                    filters={filters}
                    onChange={setFilters}
                    members={project.members}
                />

                {tasksQuery.isPending ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[1, 2, 3, 4].map((column) => (
                            <div
                                key={column}
                                className="min-h-[400px] animate-pulse rounded-xl bg-muted/40 p-4"
                            >
                                <div className="mb-6 h-6 w-28 rounded bg-muted" />

                                <div className="space-y-3">
                                    {[1, 2, 3].map((item) => (
                                        <div
                                            key={item}
                                            className="h-28 rounded-lg bg-muted"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : tasksQuery.isError ? (
                    <div className="rounded-lg border border-destructive/30 p-8 text-center">
                        <h3 className="font-semibold">
                            Unable to load tasks
                        </h3>

                        <p className="mt-2 text-sm text-muted-foreground">
                            Something went wrong while loading project tasks.
                        </p>

                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => tasksQuery.refetch()}
                        >
                            Try again
                        </Button>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center">
                        <h3 className="font-semibold">
                            {filters.search ||
                                filters.status ||
                                filters.priority ||
                                filters.assigneeId
                                ? "No matching tasks"
                                : "No tasks yet"}
                        </h3>

                        <p className="mt-2 text-sm text-muted-foreground">
                            {filters.search ||
                                filters.status ||
                                filters.priority ||
                                filters.assigneeId
                                ? "Try changing or clearing your filters."
                                : "Create your first task to get started."}
                        </p>

                        {filters.search ||
                            filters.status ||
                            filters.priority ||
                            filters.assigneeId ? (
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() =>
                                    setFilters({
                                        page: 1,
                                        limit: 100,
                                    })
                                }
                            >
                                Clear filters
                            </Button>
                        ) : canAddTask ? (
                            <Button
                                className="mt-4"
                                onClick={() => handleAddTask("TODO")}
                            >
                                Create task
                            </Button>
                        ) : null}
                    </div>
                ) : (
                    <KanbanBoard
                        tasks={tasks}
                        onMoveTask={handleMoveTask}
                        onTaskClick={setSelectedTask}
                        onAddTask={handleAddTask}
                        canDrag={true}
                        canDragTask={canDragTask}
                        canAddTask={canAddTask}
                        isMoving={moveMutation.isPending}
                    />
                )}
            </section>

            <TaskFormModal
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);

                    if (!open) {
                        setEditingTask(null);
                    }
                }}
                task={editingTask}
                defaultStatus={defaultStatus}
                onSubmit={handleSubmitTask}
                canEditAllFields={canEditSelectedTaskFields}
                isPending={
                    createMutation.isPending ||
                    updateMutation.isPending
                }
                assignees={project.members.map((member) => ({
                    id: member.user.id,
                    name: member.user.name,
                    email: member.user.email,
                }))}
            />

            <TaskDetailDrawer
                task={selectedTask}
                open={Boolean(selectedTask)}
                onOpenChange={(open) => {
                    if (!open) setSelectedTask(null);
                }}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                canEdit={canEditSelectedTask}
                canDelete={canDeleteSelectedTask}
            />
        </div>
    );
}
