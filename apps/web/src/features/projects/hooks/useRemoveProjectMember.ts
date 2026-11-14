
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectMemberService } from "../services/project-member.service";
import { projectMemberKeys } from "./project-member.keys";

export function useRemoveProjectMember(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) =>
            projectMemberService.remove(projectId, userId),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectMemberKeys.list(projectId),
            });

            queryClient.invalidateQueries({
                queryKey: ["projects"],
            });
        },
    });
}
