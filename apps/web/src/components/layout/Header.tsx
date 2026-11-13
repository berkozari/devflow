
import { Bell, Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { AppBreadcrumb } from "@/components/shared/AppBreadcrumb";
import { UserMenu } from "./UserMenu";

import { useUIStore } from "@/stores";

export function Header() {
    const toggleSidebar = useUIStore(
        (state) => state.toggleSidebar,
    );

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 md:hidden"
                    onClick={toggleSidebar}
                    aria-label="Open navigation menu"
                    aria-expanded={undefined}
                >
                    <Menu className="size-5" aria-hidden="true" />
                </Button>

                <Separator
                    orientation="vertical"
                    className="h-6 md:hidden"
                />

                <div className="min-w-0 truncate">
                    <AppBreadcrumb currentPage="Dashboard" />
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Search"
                    type="button"
                >
                    <Search className="size-5" aria-hidden="true" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                    type="button"
                >
                    <Bell className="size-5" aria-hidden="true" />
                </Button>

                <Separator
                    orientation="vertical"
                    className="mx-1 h-6"
                />

                <UserMenu />
            </div>
        </header>
    );
}
