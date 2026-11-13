
import { Link } from "react-router-dom";

import { RegisterForm } from "@/features/auth/components/RegisterForm";

export function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Create your account
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Get started with DevFlow
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <RegisterForm />

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="font-medium text-primary hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
