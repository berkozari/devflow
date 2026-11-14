
import { useQuery } from "@tanstack/react-query";

import { projectMemberService } from "../services/project-member.service";
import { projectMemberKeys } from "./project-member.keys";

export function useProjectMembers(projectId: string) {
    return useQuery({
        queryKey: projectMemberKeys.list(projectId),
        queryFn: () => projectMemberService.findAll(projectId),
        enabled: Boolean(projectId),
    });
}
