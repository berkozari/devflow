
import { Outlet } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function DashboardLayout() {
    return (
        <div className="min-h-screen bg-background">
            <Sidebar />

            <div className="md:pl-64">
                <Header />

                <main className="p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
