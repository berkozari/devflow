
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectMemberService } from "../services/project-member.service";
import { projectMemberKeys } from "./project-member.keys";

import type { UpdateProjectMemberPayload } from "../types/project-member.types";

interface UpdateMemberVariables {
    userId: string;
    data: UpdateProjectMemberPayload;
}

export function useUpdateMemberRole(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, data }: UpdateMemberVariables) =>
            projectMemberService.update(projectId, userId, data),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: projectMemberKeys.list(projectId),
            });
        },
    });
}
