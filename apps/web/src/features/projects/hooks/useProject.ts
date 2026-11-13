
import { useQuery } from "@tanstack/react-query";

import { projectService } from "../services/project.service";
import { projectKeys } from "./project.keys";

export function useProject(id: string) {
    return useQuery({
        queryKey: projectKeys.detail(id),
        queryFn: () => projectService.findById(id),
        enabled: Boolean(id),
    });
}
