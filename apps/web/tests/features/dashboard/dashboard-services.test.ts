import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardFilters, makeActivity, makeOverdueTask, makeOverview, makeWorkload } from "./fixtures";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/api", () => ({ apiClient: api }));

import { dashboardService } from "@/features/dashboard/services/dashboard.service";

beforeEach(() => {
    vi.resetAllMocks();
});

describe("Dashboard HTTP service", () => {
    it.each([
        ["getOverview", "/dashboard/overview", makeOverview()],
        ["getOverdueTasks", "/dashboard/overdue-tasks", [makeOverdueTask()]],
        ["getWorkload", "/dashboard/workload", [makeWorkload()]],
        ["getActivities", "/dashboard/activities", [makeActivity()]],
    ] as const)("%s passes filter params and returns unwrapped data", async (method, path, payload) => {
        api.get.mockResolvedValue({ data: { success: true, data: payload } });

        const result = await dashboardService[method](dashboardFilters);

        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledWith(path, { params: dashboardFilters });
        expect(result).toEqual(payload);
    });

    it("forwards empty filters without changing API contracts", async () => {
        api.get.mockResolvedValue({ data: { success: true, data: [] } });
        await dashboardService.getActivities({});
        expect(api.get).toHaveBeenCalledWith("/dashboard/activities", { params: {} });
    });

    it("propagates HTTP errors instead of returning success-shaped defaults", async () => {
        api.get.mockRejectedValue(new Error("Dashboard unavailable"));
        await expect(dashboardService.getOverview(dashboardFilters)).rejects.toThrow("Dashboard unavailable");
    });
});
