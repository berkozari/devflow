
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskService } from "../services/task.service";
import { taskKeys } from "./task.keys";

interface DeleteTaskVariables {
    taskId: string;
}

export function useDeleteTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ taskId }: DeleteTaskVariables) =>
            taskService.remove(projectId, taskId),

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
