import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const hooks = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: hooks.useAuth }));
vi.mock("@/app/providers/QueryProvider", () => ({
    QueryProvider: ({ children }: { children: ReactNode }) => (
        <div data-testid="query-provider">{children}</div>
    ),
}));

import { AppProviders, AuthProvider } from "@/app/providers/AppProviders";

describe("Auth and app providers", () => {
    it("AuthProvider starts session initialization without hiding its children", () => {
        render(<AuthProvider><p>Application child</p></AuthProvider>);
        expect(hooks.useAuth).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Application child")).toBeInTheDocument();
    });

    it("AppProviders combines query and auth providers", () => {
        hooks.useAuth.mockClear();
        render(<AppProviders><p>App content</p></AppProviders>);
        expect(screen.getByTestId("query-provider")).toContainElement(
            screen.getByText("App content"),
        );
        expect(hooks.useAuth).toHaveBeenCalledTimes(1);
    });
});
