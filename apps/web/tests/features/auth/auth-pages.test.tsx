import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/features/auth/components/LoginForm", () => ({
    LoginForm: () => <div data-testid="login-form">Login controls</div>,
}));
vi.mock("@/features/auth/components/RegisterForm", () => ({
    RegisterForm: () => <div data-testid="register-form">Register controls</div>,
}));

import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";

describe("Auth pages", () => {
    it("shows login form and a link to registration", () => {
        render(<MemoryRouter><LoginPage /></MemoryRouter>);
        expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
        expect(screen.getByTestId("login-form")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
            "href", "/register",
        );
    });

    it("shows register form and a link to login", () => {
        render(<MemoryRouter><RegisterPage /></MemoryRouter>);
        expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
        expect(screen.getByTestId("register-form")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
            "href", "/login",
        );
    });
});
