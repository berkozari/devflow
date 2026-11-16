import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardFilters, makeActivity, makeOverdueTask, makeOverview, makeWorkload } from "./fixtures";

const service = vi.hoisted(() => ({
    getOverview: vi.fn(),
    getOverdueTasks: vi.fn(),
    getWorkload: vi.fn(),
    getActivities: vi.fn(),
}));
vi.mock("@/features/dashboard/services/dashboard.service", () => ({ dashboardService: service }));

import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";

let client: QueryClient;
function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    vi.resetAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    service.getOverview.mockResolvedValue(makeOverview());
    service.getOverdueTasks.mockResolvedValue([makeOverdueTask()]);
    service.getWorkload.mockResolvedValue([makeWorkload()]);
    service.getActivities.mockResolvedValue([makeActivity()]);
});

describe("Dashboard query keys and useDashboard", () => {
    it("uses filter-sensitive keys for all four resources", () => {
        expect(dashboardKeys.all).toEqual(["dashboard"]);
        for (const key of ["overview", "overdueTasks", "workload", "activities"] as const) {
            expect(dashboardKeys[key](dashboardFilters)).not.toEqual(
                dashboardKeys[key]({ projectId: "project-2" }),
            );
        }
        expect(dashboardKeys.overview({})).toEqual(["dashboard", "overview", {}]);
        expect(dashboardKeys.overdueTasks({})).toEqual(["dashboard", "overdue-tasks", {}]);
    });

    it("loads and exposes all resources, maintaining their independent cache keys", async () => {
        const { result } = renderHook(() => useDashboard(dashboardFilters), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.isError).toBe(false);
        expect(result.current.overview).toEqual(makeOverview());
        expect(result.current.overdueTasks).toEqual([makeOverdueTask()]);
        expect(result.current.workload).toEqual([makeWorkload()]);
        expect(result.current.activities).toEqual([makeActivity()]);
        expect(service.getOverview).toHaveBeenCalledWith(dashboardFilters);
        expect(service.getOverdueTasks).toHaveBeenCalledWith(dashboardFilters);
        expect(service.getWorkload).toHaveBeenCalledWith(dashboardFilters);
        expect(service.getActivities).toHaveBeenCalledWith(dashboardFilters);
        expect(client.getQueryData(dashboardKeys.overview(dashboardFilters))).toEqual(makeOverview());
        expect(client.getQueryData(dashboardKeys.activities(dashboardFilters))).toEqual([makeActivity()]);
    });

    it("defaults to empty filters and safe empty lists while requests are pending", () => {
        service.getOverview.mockReturnValue(new Promise(() => {}));
        service.getOverdueTasks.mockReturnValue(new Promise(() => {}));
        service.getWorkload.mockReturnValue(new Promise(() => {}));
        service.getActivities.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useDashboard(), { wrapper });
        expect(result.current.isLoading).toBe(true);
        expect(result.current.overview).toBeUndefined();
        expect(result.current.overdueTasks).toEqual([]);
        expect(result.current.workload).toEqual([]);
        expect(result.current.activities).toEqual([]);
        expect(service.getOverview).toHaveBeenCalledWith({});
    });

    it("reports a single failed request while preserving successful resource data", async () => {
        service.getActivities.mockRejectedValue(new Error("Activities offline"));
        const { result } = renderHook(() => useDashboard(dashboardFilters), { wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe("Activities offline");
        expect(result.current.overview).toEqual(makeOverview());
        expect(result.current.activities).toEqual([]);
    });

    it("refetches each of the four queries", async () => {
        const { result } = renderHook(() => useDashboard({}), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await act(async () => { await result.current.refetch(); });
        for (const key of Object.keys(service) as (keyof typeof service)[]) {
            expect(service[key]).toHaveBeenCalledTimes(2);
        }
    });

    it("requeries resources after filter changes and does not reuse another project's data", async () => {
        const firstOverview = makeOverview();
        const secondOverview = makeOverview({
            statistics: { ...firstOverview.statistics, totalProjects: 7 },
        });
        service.getOverview.mockImplementation(async ({ projectId }: { projectId?: string }) =>
            projectId === "project-2" ? secondOverview : firstOverview,
        );

        let filters = { projectId: "project-1" };
        const { result, rerender } = renderHook(() => useDashboard(filters), { wrapper });
        await waitFor(() => expect(result.current.overview).toEqual(firstOverview));

        filters = { projectId: "project-2" };
        rerender();
        await waitFor(() => expect(result.current.overview).toEqual(secondOverview));

        expect(service.getOverview).toHaveBeenCalledWith({ projectId: "project-1" });
        expect(service.getOverview).toHaveBeenCalledWith({ projectId: "project-2" });
        expect(client.getQueryData(dashboardKeys.overview({ projectId: "project-1" }))).toEqual(firstOverview);
        expect(client.getQueryData(dashboardKeys.overview({ projectId: "project-2" }))).toEqual(secondOverview);
    });
});
