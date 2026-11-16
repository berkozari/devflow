import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
}));

vi.mock("@/features/auth/services/auth.service", () => ({
    authService: auth,
}));

import { useLogin } from "@/features/auth/hooks/useLogin";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useRegister } from "@/features/auth/hooks/useRegister";
import { authKeys } from "@/features/auth/hooks/useCurrentUser";
import { useAuthStore } from "@/stores/auth.store";

const user = { id: "member-1", name: "Member", email: "member@example.com" };
let queryClient: QueryClient;

function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useAuthStore.getState().clearAuth();
});

describe("useLogin", () => {
    it("persists auth state and updates the current-user cache after login", async () => {
        auth.login.mockResolvedValue({ accessToken: "fresh-access", user });
        const { result } = renderHook(() => useLogin(), { wrapper });
        const credentials = { email: user.email, password: "password123" };

        await act(async () => {
            await result.current.mutateAsync(credentials);
        });

        expect(auth.login).toHaveBeenCalledWith(
            credentials,
            expect.objectContaining({
                client: expect.any(Object),
            }),
        );
        expect(useAuthStore.getState()).toMatchObject({
            accessToken: "fresh-access", user, isAuthenticated: true,
        });
        expect(queryClient.getQueryData(authKeys.currentUser())).toEqual(user);
    });

    it("preserves the unauthenticated state when login fails", async () => {
        auth.login.mockRejectedValue(new Error("Incorrect credentials"));
        const { result } = renderHook(() => useLogin(), { wrapper });

        await act(async () => {
            await expect(result.current.mutateAsync({ email: user.email, password: "wrong" }))
                .rejects.toThrow("Incorrect credentials");
        });

        expect(useAuthStore.getState().isAuthenticated).toBe(false);
        expect(queryClient.getQueryData(authKeys.currentUser())).toBeUndefined();
    });
});

describe("useLogout", () => {
    it("clears auth state and React Query cache after logout", async () => {
        useAuthStore.getState().setAuth("old-access", user);
        queryClient.setQueryData(["projects"], [{ id: "project-1" }]);
        auth.logout.mockResolvedValue(undefined);
        const { result } = renderHook(() => useLogout(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync();
        });

        expect(auth.logout).toHaveBeenCalledTimes(1);
        expect(useAuthStore.getState()).toMatchObject({
            accessToken: null, user: null, isAuthenticated: false,
        });
        expect(queryClient.getQueryData(["projects"])).toBeUndefined();
    });

    it("still clears local session and cache when logout request fails", async () => {
        useAuthStore.getState().setAuth("old-access", user);
        queryClient.setQueryData(["projects"], [{ id: "project-1" }]);
        auth.logout.mockRejectedValue(new Error("Network disconnected"));
        const { result } = renderHook(() => useLogout(), { wrapper });

        await act(async () => {
            await expect(result.current.mutateAsync()).rejects.toThrow("Network disconnected");
        });
        expect(useAuthStore.getState().accessToken).toBeNull();
        expect(queryClient.getQueryData(["projects"])).toBeUndefined();
    });
});

describe("useRegister", () => {
    it("runs registration and returns the user", async () => {
        auth.register.mockResolvedValue(user);
        const { result } = renderHook(() => useRegister(), { wrapper });
        const payload = { name: user.name, email: user.email, password: "securepass123" };

        let registeredUser: unknown;
        await act(async () => {
            registeredUser = await result.current.mutateAsync(payload);
        });
        expect(auth.register).toHaveBeenCalledWith(
            payload,
            expect.objectContaining({
                client: expect.any(Object),
            }),
        );
        expect(registeredUser).toEqual(user);
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
});
