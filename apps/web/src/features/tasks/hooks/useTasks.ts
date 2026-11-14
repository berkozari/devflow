
import { useQuery } from "@tanstack/react-query";

import { taskService } from "../services/task.service";
import { taskKeys } from "./task.keys";

import type { TaskFilters } from "../types/task.types";

export function useTasks(
    projectId: string,
    filters?: TaskFilters,
) {
    return useQuery({
        queryKey: taskKeys.list(projectId, filters),
        queryFn: () => taskService.findAll(projectId, filters),
        enabled: Boolean(projectId),
    });
}
