
export const taskKeys = {
    all: ["tasks"] as const,

    lists: () => [...taskKeys.all, "list"] as const,

    list: (projectId: string, filters?: object) =>
        [...taskKeys.lists(), projectId, filters] as const,

    details: () => [...taskKeys.all, "detail"] as const,

    detail: (projectId: string, taskId: string) =>
        [...taskKeys.details(), projectId, taskId] as const,
};
