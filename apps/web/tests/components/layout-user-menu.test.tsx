import type { PropsWithChildren } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const logout = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock("@/features/auth/hooks/useLogout", () => ({ useLogout: () => logout }));
// Mock only Radix's portal/focus behavior; the real menu's state, buttons and
// router calls are exercised below.
vi.mock("@/components/ui/dropdown-menu", () => ({
    DropdownMenu: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DropdownMenuLabel: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick, disabled }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
        <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
    ),
}));

import { UserMenu } from "@/components/layout/UserMenu";
import { useAuthStore } from "@/stores/auth.store";

function CurrentRoute() {
    const route = useLocation();
    return <output data-testid="route">{route.pathname}</output>;
}

function renderMenu() {
    return render(<MemoryRouter initialEntries={["/"]}><UserMenu /><CurrentRoute /></MemoryRouter>);
}

beforeEach(() => {
    vi.resetAllMocks();
    logout.isPending = false;
    logout.mutateAsync.mockResolvedValue(undefined);
    useAuthStore.getState().clearAuth();
});

describe("User menu", () => {
    it("shows authenticated user identity and action buttons", () => {
        useAuthStore.getState().setAuth("token", {
            id: "user-1", name: "Ada", email: "ada@example.com",
        });
        renderMenu();
        expect(screen.getByText("Ada")).toBeInTheDocument();
        expect(screen.getByText("ada@example.com")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "User menu" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Logout" })).toBeEnabled();
    });

    it("shows a safe fallback when no user is loaded", () => {
        renderMenu();
        expect(screen.getByText("User")).toBeInTheDocument();
    });

    it.each([
        ["Profile", "/profile"],
        ["Settings", "/settings"],
    ] as const)("navigates via the %s menu action", async (label, path) => {
        renderMenu();
        await userEvent.setup().click(screen.getByRole("button", { name: label }));
        expect(screen.getByTestId("route")).toHaveTextContent(path);
    });

    it("waits for logout and navigates to login", async () => {
        renderMenu();
        await userEvent.setup().click(screen.getByRole("button", { name: "Logout" }));
        await waitFor(() => expect(screen.getByTestId("route")).toHaveTextContent("/login"));
        expect(logout.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it("disables logout and shows pending copy while a request is running", () => {
        logout.isPending = true;
        renderMenu();
        expect(screen.getByRole("button", { name: "Signing out..." })).toBeDisabled();
    });
});
