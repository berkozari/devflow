import type { PropsWithChildren } from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Keep mobile-sheet open/close behavior deterministic without relying on Radix
// portal/focus/layout internals. Sidebar and its navigation stay unmocked.
vi.mock("@/components/ui/sheet", () => ({
    Sheet: ({ children, open, onOpenChange }: PropsWithChildren<{ open: boolean; onOpenChange: (open: boolean) => void }>) => (
        <div data-testid="mobile-sheet" data-open={String(open)}>
            <button type="button" onClick={() => onOpenChange(false)}>Close mobile sheet</button>
            {open ? children : null}
        </div>
    ),
    SheetContent: ({ children }: PropsWithChildren) => <div data-testid="mobile-content">{children}</div>,
    SheetHeader: ({ children }: PropsWithChildren) => <div>{children}</div>,
    SheetTitle: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("@/components/layout/UserMenu", () => ({ UserMenu: () => <div data-testid="user-menu-placeholder" /> }));

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppBreadcrumb } from "@/components/shared/AppBreadcrumb";
import { useUIStore } from "@/stores/ui.store";

function LocationDisplay() {
    const location = useLocation();
    return <output data-testid="current-route">{location.pathname}</output>;
}

beforeEach(() => {
    useUIStore.getState().closeSidebar();
});

describe("Header and workspace breadcrumb", () => {
    it("renders navigation, header tools and profile entrypoint", () => {
        render(<MemoryRouter><Header /></MemoryRouter>);
        expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
        expect(screen.getByTestId("user-menu-placeholder")).toBeInTheDocument();
        expect(screen.getByText("Workspace")).toBeInTheDocument();
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("opens and closes the mobile sidebar through its UI-store toggle", async () => {
        render(<MemoryRouter><Header /></MemoryRouter>);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
        expect(useUIStore.getState().sidebarOpen).toBe(true);
        await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
        expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it("renders the dynamic current page in breadcrumb", () => {
        render(<MemoryRouter><AppBreadcrumb currentPage="Project settings" /></MemoryRouter>);
        expect(screen.getByText("Project settings")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/");
    });
});

describe("Sidebar navigation", () => {
    it("exposes both desktop links and marks the active route", () => {
        render(<MemoryRouter initialEntries={["/projects"]}><Sidebar /><LocationDisplay /></MemoryRouter>);
        const desktop = screen.getByRole("complementary", { name: "Desktop sidebar" });
        expect(within(desktop).getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
        expect(within(desktop).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
        const projects = within(desktop).getByRole("link", { name: "Projects" });
        expect(projects).toHaveAttribute("href", "/projects");
        expect(projects.className).toContain("bg-primary");
    });

    it("shows mobile links while open and closes after navigating", async () => {
        render(<MemoryRouter initialEntries={["/"]}><Sidebar /><LocationDisplay /></MemoryRouter>);
        act(() => { useUIStore.getState().openSidebar(); });
        const sheet = screen.getByTestId("mobile-sheet");
        expect(sheet).toHaveAttribute("data-open", "true");
        await userEvent.setup().click(within(sheet).getByRole("link", { name: "Projects" }));
        expect(useUIStore.getState().sidebarOpen).toBe(false);
        expect(screen.getByTestId("current-route")).toHaveTextContent("/projects");
        expect(sheet).toHaveAttribute("data-open", "false");
    });

    it("closes the mobile menu when its sheet requests close", async () => {
        render(<MemoryRouter><Sidebar /></MemoryRouter>);
        act(() => { useUIStore.getState().openSidebar(); });
        await userEvent.setup().click(screen.getByRole("button", { name: "Close mobile sheet" }));
        expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
});
