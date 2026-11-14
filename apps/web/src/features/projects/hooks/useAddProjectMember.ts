
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectMemberService } from "../services/project-member.service";
import { projectMemberKeys } from "./project-member.keys";

import type { AddProjectMemberPayload } from "../types/project-member.types";

export function useAddProjectMember(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: AddProjectMemberPayload) =>
            projectMemberService.add(projectId, data),

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
