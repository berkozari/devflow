import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskService } from "../services/task.service";
import { taskKeys } from "./task.keys";

import type { MoveTaskPayload } from "../types/task.types";

interface MoveTaskVariables {
    taskId: string;
    data: MoveTaskPayload;
}

export function useMoveTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ taskId, data }: MoveTaskVariables) =>
            taskService.move(projectId, taskId, data),

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
