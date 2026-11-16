import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createBrowserRouter } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

vi.mock("@tanstack/react-query-devtools", () => ({ ReactQueryDevtools: () => null }));
// Spy on route registration, without mounting protected pages or booting a real browser history.
vi.mock("react-router-dom", async (original) => {
    const actual = await original<typeof import("react-router-dom")>();
    return { ...actual, createBrowserRouter: vi.fn(() => ({ routes: [] })) };
});
vi.mock("@/pages/auth/LoginPage", () => ({ LoginPage: () => null }));
vi.mock("@/pages/auth/RegisterPage", () => ({ RegisterPage: () => null }));
vi.mock("@/pages/dashboard/DashboardPage", () => ({ DashboardPage: () => null }));
vi.mock("@/pages/projects/ProjectsPage", () => ({ ProjectsPage: () => null }));
vi.mock("@/pages/projects/ProjectDetailPage", () => ({ ProjectDetailPage: () => null }));
vi.mock("@/pages/projects/ProjectSettingsPage", () => ({ ProjectSettingsPage: () => null }));
vi.mock("@/features/auth/components/ProtectedRoute", () => ({ ProtectedRoute: () => null }));
vi.mock("@/features/auth/components/GuestRoute", () => ({ GuestRoute: () => null }));
vi.mock("@/layout/DashboardLayout", () => ({ DashboardLayout: () => null }));

import { QueryProvider } from "@/app/providers/QueryProvider";
import { queryClient } from "@/lib/query-client";

function ClientProbe() {
    const client = useQueryClient();
    return <output data-testid="provider-client">{client === queryClient ? "same client" : "unexpected client"}</output>;
}

describe("App query provider / route table smoke tests", () => {
    it("exposes the application's shared QueryClient to descendants", () => {
        render(<QueryProvider><ClientProbe /></QueryProvider>);
        expect(screen.getByTestId("provider-client")).toHaveTextContent("same client");
    });

    it("registers auth-protected project details and settings routes", async () => {
        await import("@/app/router/index");
        expect(createBrowserRouter).toHaveBeenCalledOnce();
        const [routes] = vi.mocked(createBrowserRouter).mock.calls[0]!;
        const guest = routes[0]!;
        const protectedBranch = routes[1]!;
        const guestPaths = guest.children?.map((r) => r.path);
        expect(guestPaths).toEqual(["/login", "/register"]);
        const workspace = protectedBranch.children?.[0];
        const workspacePaths = workspace?.children?.map((r) => r.path);
        expect(workspacePaths).toEqual([
            "/dashboard", "/projects", "/projects/:projectId", "/projects/:projectId/settings",
        ]);
        expect(routes[2]?.path).toBe("*");
    });
});
