
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskService } from "../services/task.service";
import { taskKeys } from "./task.keys";

import type { UpdateTaskPayload } from "../types/task.types";

interface UpdateTaskVariables {
    taskId: string;
    data: UpdateTaskPayload;
}

export function useUpdateTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ taskId, data }: UpdateTaskVariables) =>
            taskService.update(projectId, taskId, data),

        onSuccess: async (_, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: taskKeys.lists(),
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
