
import { createBrowserRouter, Navigate } from "react-router-dom";

import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";

import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { GuestRoute } from "@/features/auth/components/GuestRoute";

import { DashboardLayout } from "@/layout/DashboardLayout";

import { ProjectsPage } from "@/pages/projects/ProjectsPage";
import { ProjectDetailPage } from "@/pages/projects/ProjectDetailPage";
import { ProjectSettingsPage } from "@/pages/projects/ProjectSettingsPage";

export const router = createBrowserRouter([
    {
        element: <GuestRoute />,
        children: [
            {
                path: "/login",
                element: <LoginPage />,
            },
            {
                path: "/register",
                element: <RegisterPage />,
            },
        ],
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <DashboardLayout />,
                children: [
                    {
                        path: "/dashboard",
                        element: <DashboardPage />,
                    },
                    {
                        path: "/projects",
                        element: <ProjectsPage />,
                    },
                    {
                        path: "/projects/:projectId",
                        element: <ProjectDetailPage />,
                    },
                    {
                        path: "/projects/:projectId/settings",
                        element: <ProjectSettingsPage />,
                    },
                ],
            },
        ],
    },
    {
        path: "*",
        element: <Navigate to="/dashboard" replace />,
    },
]);
