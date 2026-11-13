
import type { ProjectQueryParams } from "../services/project.service";

export const projectKeys = {
    all: ["projects"] as const,

    lists: () => [...projectKeys.all, "list"] as const,

    list: (params?: ProjectQueryParams) =>
        [...projectKeys.lists(), params] as const,

    details: () => [...projectKeys.all, "detail"] as const,

    detail: (id: string) =>
        [...projectKeys.details(), id] as const,
};
