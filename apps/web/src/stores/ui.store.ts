
import { create } from "zustand";

import type { UIStore } from "./types";

export const useUIStore = create<UIStore>((set) => ({
    sidebarOpen: false,

    toggleSidebar: () =>
        set((state) => ({
            sidebarOpen: !state.sidebarOpen,
        })),

    openSidebar: () => set({ sidebarOpen: true }),

    closeSidebar: () => set({ sidebarOpen: false }),
}));
