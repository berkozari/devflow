// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { DashboardLayout } from "@/layout/DashboardLayout";

// Focus on the layout contract, not Header/Sidebar internals.
vi.mock("@/components/layout/Header", () => ({
    Header: () => <header data-testid="dashboard-header">Header</header>,
}));
vi.mock("@/components/layout/Sidebar", () => ({
    Sidebar: () => <nav data-testid="dashboard-sidebar">Sidebar</nav>,
}));

describe("DashboardLayout", () => {
    it("renders header, sidebar and the nested route inside main", () => {
        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Routes>
                    <Route path="/dashboard" element={<DashboardLayout />}>
                        <Route index element={<h1>Project overview</h1>} />
                    </Route>
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
        expect(screen.getByTestId("dashboard-sidebar")).toBeInTheDocument();
        expect(within(screen.getByRole("main")).getByRole("heading", {
            name: "Project overview",
        })).toBeInTheDocument();
    });
});
