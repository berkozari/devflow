
import { create } from "zustand";

import type { AuthStore } from "@/features/auth/types/auth.types";

export const useAuthStore = create<AuthStore>((set) => ({
    accessToken: null,
    user: null,
    isAuthenticated: false,

    setAuth: (accessToken, user) =>
        set({
            accessToken,
            user,
            isAuthenticated: true,
        }),

    setAccessToken: (accessToken) =>
        set({
            accessToken,
            isAuthenticated: true,
        }),

    setUser: (user) =>
        set({
            user,
            isAuthenticated: true,
        }),

    clearAuth: () =>
        set({
            accessToken: null,
            user: null,
            isAuthenticated: false,
        }),
}));
