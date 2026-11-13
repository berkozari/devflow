
import { useNavigate } from "react-router-dom";
import { LogOut, User, Settings } from "lucide-react";

import { useAuthStore } from "@/stores";
import { useLogout } from "@/features/auth/hooks/useLogout";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);

    const logout = useLogout();

    async function handleLogout() {
        try {
            await logout.mutateAsync();
        } finally {
            navigate("/login", {
                replace: true,
            });
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="User menu"
                >
                    <User className="size-5" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-56"
            >
                <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                        <span className="font-medium">
                            {user?.name ?? "User"}
                        </span>

                        <span className="text-xs font-normal text-muted-foreground">
                            {user?.email ?? ""}
                        </span>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                >
                    <User className="mr-2 size-4" />
                    Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => navigate("/settings")}
                >
                    <Settings className="mr-2 size-4" />
                    Settings
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={logout.isPending}
                    className="text-destructive focus:text-destructive"
                >
                    <LogOut className="mr-2 size-4" />

                    {logout.isPending
                        ? "Signing out..."
                        : "Logout"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
