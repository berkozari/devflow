import { beforeEach, describe, expect, it } from "vitest";

import { useUIStore } from "@/stores/ui.store";

beforeEach(() => {
    useUIStore.setState({ sidebarOpen: false });
});

describe("ui.store", () => {
    it("starts with a closed sidebar", () => {
        expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it("toggles the sidebar in both directions", () => {
        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(true);

        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it("opens the sidebar", () => {
        useUIStore.getState().openSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it("closes the sidebar", () => {
        useUIStore.getState().openSidebar();
        useUIStore.getState().closeSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
});
