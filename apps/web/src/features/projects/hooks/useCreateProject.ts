
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectService } from "../services/project.service";
import type { CreateProjectPayload } from "../types/project.types";

import { projectKeys } from "./project.keys";

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateProjectPayload) =>
            projectService.create(data),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: projectKeys.lists(),
            });
        },
    });
}
