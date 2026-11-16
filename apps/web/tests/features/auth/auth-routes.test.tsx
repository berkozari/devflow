import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { GuestRoute } from "@/features/auth/components/GuestRoute";
import { useAuth } from "@/features/auth/hooks/useAuth";

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: vi.fn() }));

type AuthStatus = Pick<ReturnType<typeof useAuth>, "isAuthenticated" | "isLoading">;

function setAuth({ isAuthenticated, isLoading }: AuthStatus) {
    vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated,
        isLoading,
        isError: false,
        error: null,
    });
}

function LoginDestination() {
    const location = useLocation();
    const from = location.state?.from as { pathname?: string; search?: string } | undefined;
    return <p data-testid="login-destination">Login from {from?.pathname ?? "none"}{from?.search ?? ""}</p>;
}

function renderProtected() {
    return render(
        <MemoryRouter initialEntries={["/projects/42?tab=members"]}>
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route path="/projects/:id" element={<h1>Project private area</h1>} />
                </Route>
                <Route path="/login" element={<LoginDestination />} />
            </Routes>
        </MemoryRouter>,
    );
}

function renderGuest() {
    return render(
        <MemoryRouter initialEntries={["/login"]}>
            <Routes>
                <Route element={<GuestRoute />}>
                    <Route path="/login" element={<h1>Guest page</h1>} />
                </Route>
                <Route path="/dashboard" element={<h1>Dashboard page</h1>} />
            </Routes>
        </MemoryRouter>,
    );
}

function renderGuard() {
    return render(
        <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
                <Route path="/dashboard" element={
                    <AuthGuard><h1>Protected content</h1></AuthGuard>
                } />
                <Route path="/login" element={<h1>Login page</h1>} />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("ProtectedRoute", () => {
    it("shows authentication status while loading", () => {
        setAuth({ isAuthenticated: false, isLoading: true });
        renderProtected();
        expect(screen.getByText("Checking authentication...")).toBeInTheDocument();
        expect(screen.queryByText("Project private area")).not.toBeInTheDocument();
    });

    it("redirects guests to login and retains their original URL", () => {
        setAuth({ isAuthenticated: false, isLoading: false });
        renderProtected();
        expect(screen.getByTestId("login-destination")).toHaveTextContent(
            "Login from /projects/42?tab=members",
        );
    });

    it("renders a protected child for authenticated users", () => {
        setAuth({ isAuthenticated: true, isLoading: false });
        renderProtected();
        expect(screen.getByRole("heading", { name: "Project private area" })).toBeInTheDocument();
    });
});

describe("GuestRoute", () => {
    it("shows loading state while checking a session", () => {
        setAuth({ isAuthenticated: false, isLoading: true });
        renderGuest();
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders guest pages for anonymous visitors", () => {
        setAuth({ isAuthenticated: false, isLoading: false });
        renderGuest();
        expect(screen.getByRole("heading", { name: "Guest page" })).toBeInTheDocument();
    });

    it("redirects authenticated visitors to the dashboard", () => {
        setAuth({ isAuthenticated: true, isLoading: false });
        renderGuest();
        expect(screen.getByRole("heading", { name: "Dashboard page" })).toBeInTheDocument();
    });
});

describe("AuthGuard", () => {
    it("displays loading state until authentication is resolved", () => {
        setAuth({ isAuthenticated: false, isLoading: true });
        renderGuard();
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("redirects unauthenticated visitors to login", () => {
        setAuth({ isAuthenticated: false, isLoading: false });
        renderGuard();
        expect(screen.getByRole("heading", { name: "Login page" })).toBeInTheDocument();
    });

    it("renders its children for authenticated users", () => {
        setAuth({ isAuthenticated: true, isLoading: false });
        renderGuard();
        expect(screen.getByRole("heading", { name: "Protected content" })).toBeInTheDocument();
    });
});
