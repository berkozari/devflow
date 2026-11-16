import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { useRegister } from "@/features/auth/hooks/useRegister";

vi.mock("@/features/auth/hooks/useRegister", () => ({ useRegister: vi.fn() }));

const mutateAsync = vi.fn();

function Destination() {
    const location = useLocation();
    return <p data-testid="destination">{location.pathname}</p>;
}

function renderRegister() {
    return render(
        <MemoryRouter initialEntries={["/register"]}>
            <Routes>
                <Route path="/register" element={<RegisterForm />} />
                <Route path="*" element={<Destination />} />
            </Routes>
        </MemoryRouter>,
    );
}

async function enterDetails(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByPlaceholderText("Your name"), "New Member");
    await user.type(screen.getByPlaceholderText("Your email"), "new@example.com");
    await user.type(screen.getByPlaceholderText("At least 8 characters"), "securepass123");
}

beforeEach(() => {
    vi.resetAllMocks();
    mutateAsync.mockResolvedValue({ id: "new-user" });
    vi.mocked(useRegister).mockReturnValue({
        mutateAsync,
        isPending: false,
    } as unknown as ReturnType<typeof useRegister>);
});

describe("RegisterForm", () => {
    it("renders all required controls", () => {
        renderRegister();
        expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Your email")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("At least 8 characters"))
            .toHaveAttribute("type", "password");
    });

    it("prevents empty fields from reaching the API", async () => {
        const user = userEvent.setup();
        renderRegister();
        await user.click(screen.getByRole("button", { name: "Create Account" }));
        expect(await screen.findByText("Name must contain at least 2 characters"))
            .toBeInTheDocument();
        expect(screen.getByText("Invalid email address")).toBeInTheDocument();
        expect(screen.getByText("Password must contain at least 8 characters"))
            .toBeInTheDocument();
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it("validates password length", async () => {
        const user = userEvent.setup();
        renderRegister();
        await user.type(screen.getByPlaceholderText("Your name"), "New Member");
        await user.type(screen.getByPlaceholderText("Your email"), "new@example.com");
        await user.type(screen.getByPlaceholderText("At least 8 characters"), "short");
        await user.click(screen.getByRole("button", { name: "Create Account" }));
        expect(await screen.findByText("Password must contain at least 8 characters"))
            .toBeInTheDocument();
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it("registers and redirects to login after success", async () => {
        const user = userEvent.setup();
        renderRegister();
        await enterDetails(user);
        await user.click(screen.getByRole("button", { name: "Create Account" }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
            name: "New Member", email: "new@example.com", password: "securepass123",
        }));
        expect(await screen.findByTestId("destination")).toHaveTextContent("/login");
    });

    it("displays a generic error without redirecting when registration fails", async () => {
        const user = userEvent.setup();
        mutateAsync.mockRejectedValueOnce(new Error("duplicate email"));
        renderRegister();
        await enterDetails(user);
        await user.click(screen.getByRole("button", { name: "Create Account" }));
        expect(await screen.findByText("Registration failed. Please try again."))
            .toBeInTheDocument();
        expect(screen.queryByTestId("destination")).not.toBeInTheDocument();
    });

    it("blocks further submissions while pending", () => {
        vi.mocked(useRegister).mockReturnValue({
            mutateAsync,
            isPending: true,
        } as unknown as ReturnType<typeof useRegister>);
        renderRegister();
        expect(screen.getByRole("button", { name: "Creating account..." })).toBeDisabled();
    });
});
