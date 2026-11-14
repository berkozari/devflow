
export const projectMemberKeys = {
    all: ["project-members"] as const,

    lists: () => [...projectMemberKeys.all, "list"] as const,

    list: (projectId: string) =>
        [...projectMemberKeys.lists(), projectId] as const,
};
