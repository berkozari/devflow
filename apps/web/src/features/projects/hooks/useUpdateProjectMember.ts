
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectMemberService } from "../services/project-member.service";
import { projectMemberKeys } from "./project-member.keys";
import { projectKeys } from "./project.keys";

import type {
    UpdateProjectMemberPayload,
} from "../types/project-member.types";

interface UpdateMemberVariables {
    projectId: string;
    userId: string;
    data: UpdateProjectMemberPayload;
}

export function useUpdateProjectMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            projectId,
            userId,
            data,
        }: UpdateMemberVariables) =>
            projectMemberService.update(
                projectId,
                userId,
                data,
            ),

        onSuccess: async (_response, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: projectMemberKeys.list(
                        variables.projectId,
                    ),
                }),

                queryClient.invalidateQueries({
                    queryKey: projectKeys.detail(
                        variables.projectId,
                    ),
                }),
            ]);
        },
    });
}
