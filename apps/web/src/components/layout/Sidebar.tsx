
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    FolderKanban,
} from "lucide-react";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

import { useUIStore } from "@/stores";

const navigation = [
    {
        label: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
    },
    {
        label: "Projects",
        path: "/projects",
        icon: FolderKanban,
    },
];

interface SidebarNavigationProps {
    onNavigate?: () => void;
}

function SidebarNavigation({
    onNavigate,
}: SidebarNavigationProps) {
    return (
        <nav
            aria-label="Main navigation"
            className="space-y-1 p-4"
        >
            {navigation.map((item) => {
                const Icon = item.icon;

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/"}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            }`
                        }
                    >
                        <Icon size={18} aria-hidden="true" />
                        {item.label}
                    </NavLink>
                );
            })}
        </nav>
    );
}

function SidebarBrand() {
    return (
        <div className="flex h-16 items-center border-b px-6">
            <span className="text-xl font-bold tracking-tight">
                DevFlow
            </span>
        </div>
    );
}

export function Sidebar() {
    const sidebarOpen = useUIStore(
        (state) => state.sidebarOpen,
    );

    const closeSidebar = useUIStore(
        (state) => state.closeSidebar,
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                aria-label="Desktop sidebar"
                className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-card md:block"
            >
                <SidebarBrand />
                <SidebarNavigation />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet
                open={sidebarOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeSidebar();
                    }
                }}
            >
                <SheetContent
                    side="left"
                    className="w-64 p-0"
                >
                    <SheetHeader className="border-b px-6 py-4">
                        <SheetTitle className="text-left">
                            DevFlow
                        </SheetTitle>
                    </SheetHeader>

                    <SidebarNavigation
                        onNavigate={closeSidebar}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}
