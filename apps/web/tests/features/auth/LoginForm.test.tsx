import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { useLogin } from "@/features/auth/hooks/useLogin";

vi.mock("@/features/auth/hooks/useLogin", () => ({ useLogin: vi.fn() }));

const mutateAsync = vi.fn();

function Destination() {
    const location = useLocation();
    return <p data-testid="destination">{location.pathname}</p>;
}

function renderLogin(from?: string) {
    return render(
        <MemoryRouter initialEntries={[{
            pathname: "/login",
            state: from ? { from: { pathname: from } } : undefined,
        }]}>
            <Routes>
                <Route path="/login" element={<LoginForm />} />
                <Route path="*" element={<Destination />} />
            </Routes>
        </MemoryRouter>,
    );
}

async function enterCredentials(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByPlaceholderText("Enter your email"), "member@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
}

beforeEach(() => {
    vi.resetAllMocks();
    mutateAsync.mockResolvedValue({ accessToken: "test-token" });
    vi.mocked(useLogin).mockReturnValue({
        mutateAsync,
        isPending: false,
    } as unknown as ReturnType<typeof useLogin>);
});

describe("LoginForm", () => {
    it("renders email, password and submit controls", () => {
        renderLogin();
        expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter your password")).toHaveAttribute("type", "password");
        expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
    });

    it("shows validation errors without calling the API", async () => {
        const user = userEvent.setup();
        renderLogin();
        await user.click(screen.getByRole("button", { name: "Sign In" }));
        expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
        expect(screen.getByText("Password is required")).toBeInTheDocument();
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it("rejects malformed email and does not submit", async () => {
        const user = userEvent.setup();
        renderLogin();
        await user.type(screen.getByPlaceholderText("Enter your email"), "wrong-address");
        await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
        // HTML5 email constraints can prevent browser-level submit before Zod runs.
        // Dispatch submit directly to exercise the React Hook Form validation contract.
        fireEvent.submit(screen.getByRole("button", { name: "Sign In" }).closest("form")!);
        expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it("sends credentials and redirects to dashboard after success", async () => {
        const user = userEvent.setup();
        renderLogin();
        await enterCredentials(user);
        await user.click(screen.getByRole("button", { name: "Sign In" }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
            email: "member@example.com", password: "password123",
        }));
        expect(await screen.findByTestId("destination")).toHaveTextContent("/dashboard");
    });

    it("returns to the protected destination after successful login", async () => {
        const user = userEvent.setup();
        renderLogin("/projects/123");
        await enterCredentials(user);
        await user.click(screen.getByRole("button", { name: "Sign In" }));
        expect(await screen.findByTestId("destination")).toHaveTextContent("/projects/123");
    });

    it("displays a generic error and stays on login when the request fails", async () => {
        const user = userEvent.setup();
        mutateAsync.mockRejectedValueOnce(new Error("server error"));
        renderLogin();
        await enterCredentials(user);
        await user.click(screen.getByRole("button", { name: "Sign In" }));
        expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
        expect(screen.queryByTestId("destination")).not.toBeInTheDocument();
    });

    it("disables submitting while login is pending", () => {
        vi.mocked(useLogin).mockReturnValue({
            mutateAsync,
            isPending: true,
        } as unknown as ReturnType<typeof useLogin>);
        renderLogin();
        expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
    });
});
