import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    post: vi.fn(),
    getMe: vi.fn(),
}));

vi.mock("@/services/api", () => ({ apiClient: { post: mocks.post } }));
vi.mock("@/features/auth/services/user.service", () => ({
    userService: { getMe: mocks.getMe },
}));

import { authKeys, useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useAuthStore } from "@/stores/auth.store";

const user = { id: "member-1", name: "Member", email: "member@example.com" };
let queryClient: QueryClient;

function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.getState().clearAuth();
    queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mocks.getMe.mockResolvedValue(user);
});

describe("useCurrentUser", () => {
    it("uses a stable auth current-user query key", () => {
        expect(authKeys.currentUser()).toEqual(["auth", "current-user"]);
    });

    it("refreshes an absent access token before loading the current user", async () => {
        mocks.post.mockResolvedValue({ data: { data: { accessToken: "fresh-token" } } });
        const { result } = renderHook(() => useCurrentUser(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(user);
        expect(mocks.post).toHaveBeenCalledWith("/auth/refresh");
        expect(mocks.post).toHaveBeenCalledTimes(1);
        expect(mocks.getMe).toHaveBeenCalledTimes(1);
        expect(useAuthStore.getState().accessToken).toBe("fresh-token");
    });

    it("does not refresh when a token already exists", async () => {
        useAuthStore.getState().setAccessToken("existing-token");
        const { result } = renderHook(() => useCurrentUser(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mocks.post).not.toHaveBeenCalled();
        expect(mocks.getMe).toHaveBeenCalledTimes(1);
    });

    it("honors enabled=false and avoids all HTTP requests", async () => {
        const { result } = renderHook(() => useCurrentUser(false), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(mocks.post).not.toHaveBeenCalled();
        expect(mocks.getMe).not.toHaveBeenCalled();
    });

    it("surfaces a failed token refresh without fetching the user", async () => {
        mocks.post.mockRejectedValue(new Error("Refresh denied"));
        const { result } = renderHook(() => useCurrentUser(), { wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe("Refresh denied");
        expect(mocks.getMe).not.toHaveBeenCalled();
    });

    it("surfaces current-user failures when already authenticated", async () => {
        useAuthStore.getState().setAccessToken("existing-token");
        mocks.getMe.mockRejectedValue(new Error("User lookup failed"));
        const { result } = renderHook(() => useCurrentUser(), { wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe("User lookup failed");
    });
});
