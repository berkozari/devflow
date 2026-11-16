import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "@/stores/auth.store";

type AuthState = ReturnType<typeof useAuthStore.getState>;
type AuthUser = Parameters<AuthState["setAuth"]>[1];

const user = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Test User",
    email: "user@example.test",
} as AuthUser;

beforeEach(() => {
    useAuthStore.getState().clearAuth();
});

describe("auth.store", () => {
    it("starts unauthenticated", () => {
        expect(useAuthStore.getState()).toMatchObject({
            accessToken: null,
            user: null,
            isAuthenticated: false,
        });
    });

    it("stores the access token and user on login", () => {
        useAuthStore.getState().setAuth("access-token", user);

        expect(useAuthStore.getState()).toMatchObject({
            accessToken: "access-token",
            user,
            isAuthenticated: true,
        });
    });

    it("updates a token without discarding the existing user", () => {
        useAuthStore.getState().setAuth("old-token", user);
        useAuthStore.getState().setAccessToken("new-token");

        expect(useAuthStore.getState()).toMatchObject({
            accessToken: "new-token",
            user,
            isAuthenticated: true,
        });
    });

    it("updates the user while retaining the access token", () => {
        useAuthStore.getState().setAuth("access-token", user);
        const updatedUser = { ...user, name: "New Name" } as AuthUser;
        useAuthStore.getState().setUser(updatedUser);

        expect(useAuthStore.getState()).toMatchObject({
            accessToken: "access-token",
            user: updatedUser,
            isAuthenticated: true,
        });
    });

    it("removes both credentials and user data on logout", () => {
        useAuthStore.getState().setAuth("access-token", user);
        useAuthStore.getState().clearAuth();

        expect(useAuthStore.getState()).toMatchObject({
            accessToken: null,
            user: null,
            isAuthenticated: false,
        });
    });
});
