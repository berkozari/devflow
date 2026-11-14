
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskService } from "../services/task.service";
import { taskKeys } from "./task.keys";

import type {
    MoveTaskPayload,
    Task,
    TaskFilters,
    TaskListResponse,
    TaskResponse,
} from "../types/task.types";

interface MoveTaskVariables {
    taskId: string;
    data: MoveTaskPayload;
}

export function useMoveTask(projectId: string) {
    const queryClient = useQueryClient();

    const projectListKey = [
        ...taskKeys.lists(),
        projectId,
    ];

    return useMutation({
        mutationFn: ({ taskId, data }: MoveTaskVariables) =>
            taskService.move(projectId, taskId, data),

        onMutate: async ({ taskId, data }) => {
            // Cancel ongoing queries to prevent stale responses
            // from overwriting our optimistic update.
            await Promise.all([
                queryClient.cancelQueries({
                    queryKey: projectListKey,
                }),

                queryClient.cancelQueries({
                    queryKey: taskKeys.detail(projectId, taskId),
                }),
            ]);

            // Snapshot all cached task lists for this project.
            const previousLists =
                queryClient.getQueriesData<TaskListResponse>({
                    queryKey: projectListKey,
                });

            // Snapshot task detail.
            const previousDetail =
                queryClient.getQueryData<TaskResponse>(
                    taskKeys.detail(projectId, taskId),
                );

            // Optimistically update cached task lists.
            previousLists.forEach(([queryKey, previousData]) => {
                if (!previousData) return;

                const taskExists = previousData.data.some(
                    (task) => task.id === taskId,
                );

                if (!taskExists) return;

                const filters = queryKey[3] as
                    | TaskFilters
                    | undefined;

                const movedTask = previousData.data.find(
                    (task) => task.id === taskId,
                );

                if (!movedTask) return;

                // Remove the task from filtered lists
                // when its new status no longer matches.
                if (
                    filters?.status &&
                    filters.status !== data.status
                ) {
                    queryClient.setQueryData<TaskListResponse>(
                        queryKey,
                        {
                            ...previousData,
                            data: previousData.data.filter(
                                (task) => task.id !== taskId,
                            ),
                            pagination: {
                                ...previousData.pagination,
                                total: Math.max(
                                    0,
                                    previousData.pagination.total - 1,
                                ),
                                totalPages: Math.ceil(
                                    Math.max(
                                        0,
                                        previousData.pagination.total - 1,
                                    ) / previousData.pagination.limit,
                                ),
                            },
                        },
                    );

                    return;
                }

                // Remove the task before inserting it
                // at its new position.
                const remainingTasks = previousData.data.filter(
                    (task) => task.id !== taskId,
                );

                const updatedTask: Task = {
                    ...movedTask,
                    status: data.status,
                };

                const targetIndex = data.beforeTaskId
                    ? remainingTasks.findIndex(
                        (task) => task.id === data.beforeTaskId,
                    )
                    : -1;

                const insertIndex =
                    targetIndex >= 0
                        ? targetIndex
                        : remainingTasks.length;

                const updatedTasks = [...remainingTasks];

                updatedTasks.splice(
                    insertIndex,
                    0,
                    updatedTask,
                );

                queryClient.setQueryData<TaskListResponse>(
                    queryKey,
                    {
                        ...previousData,
                        data: updatedTasks,
                    },
                );
            });

            // Optimistically update task detail.
            queryClient.setQueryData<TaskResponse>(
                taskKeys.detail(projectId, taskId),
                (previousData) => {
                    if (!previousData) return previousData;

                    return {
                        ...previousData,
                        data: {
                            ...previousData.data,
                            status: data.status,
                        },
                    };
                },
            );

            return {
                previousLists,
                previousDetail,
            };
        },

        onError: (_error, variables, context) => {
            // Restore previous task lists.
            context?.previousLists.forEach(
                ([queryKey, previousData]) => {
                    if (previousData) {
                        queryClient.setQueryData(
                            queryKey,
                            previousData,
                        );
                    }
                },
            );

            // Restore previous task detail.
            if (context?.previousDetail) {
                queryClient.setQueryData(
                    taskKeys.detail(
                        projectId,
                        variables.taskId,
                    ),
                    context.previousDetail,
                );
            }
        },

        onSettled: async (_data, _error, variables) => {
            // Synchronize with the backend after success or failure.
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: projectListKey,
                }),

                queryClient.invalidateQueries({
                    queryKey: taskKeys.detail(
                        projectId,
                        variables.taskId,
                    ),
                }),
            ]);
        },
    });
}
