import type { ReactNode } from "react";

import { QueryProvider } from "./QueryProvider";
import { useAuth } from "../../features/auth/hooks/useAuth";

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({
    children,
}: AuthProviderProps) {
    useAuth();

    return <>{children}</>;
}

interface AppProvidersProps {
    children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
    return (
        <QueryProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </QueryProvider>
    );
}