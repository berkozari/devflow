
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectService } from "../services/project.service";

import type {
    UpdateProjectPayload,
} from "../types/project.types";

import { projectKeys } from "./project.keys";

interface UpdateProjectVariables {
    id: string;
    data: UpdateProjectPayload;
}

export function useUpdateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: UpdateProjectVariables) =>
            projectService.update(id, data),

        onSuccess: async (_response, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: projectKeys.detail(variables.id),
                }),

                queryClient.invalidateQueries({
                    queryKey: projectKeys.lists(),
                }),
            ]);
        },
    });
}
