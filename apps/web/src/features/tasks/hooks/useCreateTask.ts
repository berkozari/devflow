
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskService } from "../services/task.service";
import { taskKeys } from "./task.keys";

import type { CreateTaskPayload } from "../types/task.types";

export function useCreateTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTaskPayload) =>
            taskService.create(projectId, data),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: taskKeys.lists(),
            });
        },
    });
}
