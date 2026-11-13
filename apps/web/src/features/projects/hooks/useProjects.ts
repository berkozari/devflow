
import { useQuery } from "@tanstack/react-query";

import { projectService } from "../services/project.service";
import type { ProjectQueryParams } from "../services/project.service";

import { projectKeys } from "./project.keys";

export function useProjects(params?: ProjectQueryParams) {
    return useQuery({
        queryKey: projectKeys.list(params),
        queryFn: () => projectService.findAll(params),
    });
}
