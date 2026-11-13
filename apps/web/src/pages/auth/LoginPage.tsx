
import { Link } from "react-router-dom";

import { LoginForm } from "@/features/auth/components/LoginForm";

export function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Sign in to continue to DevFlow
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <LoginForm />

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link
                            to="/register"
                            className="font-medium text-primary hover:underline"
                        >
                            Create account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
