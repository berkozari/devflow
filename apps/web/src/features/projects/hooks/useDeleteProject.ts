
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectService } from "../services/project.service";
import { projectKeys } from "./project.keys";

export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            projectService.delete(id),

        onSuccess: async (_response, id) => {
            queryClient.removeQueries({
                queryKey: projectKeys.detail(id),
                exact: true,
            });

            await queryClient.invalidateQueries({
                queryKey: projectKeys.lists(),
            });
        },
    });
}
