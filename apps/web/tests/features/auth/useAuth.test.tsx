import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useAuthStore } from "@/stores/auth.store";
import { ApiError } from "@/utils/api-error";

vi.mock("@/features/auth/hooks/useCurrentUser", () => ({ useCurrentUser: vi.fn() }));

const user = { id: "member-1", name: "Member", email: "member@example.com" };

type QueryState = {
    data?: typeof user;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
};

function setQuery(state: QueryState) {
    vi.mocked(useCurrentUser).mockReturnValue(
        state as unknown as ReturnType<typeof useCurrentUser>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
});

describe("useAuth", () => {
    it("returns loading and unauthenticated while the session is pending", () => {
        setQuery({ isPending: true, isError: false, error: null });
        const { result } = renderHook(() => useAuth());
        expect(result.current).toMatchObject({
            user: null,
            isLoading: true,
            isAuthenticated: false,
            isError: false,
        });
    });

    it("syncs fetched user information into Zustand", async () => {
        setQuery({ data: user, isPending: false, isError: false, error: null });
        const { result } = renderHook(() => useAuth());
        expect(result.current.user).toEqual(user);
        expect(result.current.isAuthenticated).toBe(true);
        await waitFor(() => {
            expect(useAuthStore.getState().user).toEqual(user);
            expect(useAuthStore.getState().isAuthenticated).toBe(true);
        });
    });

    it("clears local session state after an unauthorized current-user response", async () => {
        useAuthStore.getState().setAuth("old-token", user);
        const error = new ApiError("Unauthorized", 401);
        setQuery({ isPending: false, isError: true, error });
        const { result } = renderHook(() => useAuth());
        expect(result.current.isError).toBe(true);
        await waitFor(() => {
            expect(useAuthStore.getState()).toMatchObject({
                accessToken: null, user: null, isAuthenticated: false,
            });
        });
    });

    it("does not clear credentials on unrelated server errors", async () => {
        useAuthStore.getState().setAuth("still-valid", user);
        setQuery({
            isPending: false, isError: true,
            error: new ApiError("Server unavailable", 503),
        });
        renderHook(() => useAuth());
        await waitFor(() => {
            expect(useAuthStore.getState().accessToken).toBe("still-valid");
        });
    });

    it("does not clear credentials for non-API errors", () => {
        useAuthStore.getState().setAuth("still-valid", user);
        setQuery({ isPending: false, isError: true, error: new Error("Unexpected") });
        renderHook(() => useAuth());
        expect(useAuthStore.getState().accessToken).toBe("still-valid");
    });
});
