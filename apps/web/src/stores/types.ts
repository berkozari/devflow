export interface UIState {
    sidebarOpen: boolean;
}

export interface UIActions {
    toggleSidebar: () => void;
    openSidebar: () => void;
    closeSidebar: () => void;
}

export type UIStore = UIState & UIActions;