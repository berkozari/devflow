
import { createBrowserRouter } from "react-router-dom";

import { DashboardLayout } from "@/layout/DashboardLayout";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ProjectsPage } from "@/pages/projects/ProjectsPage";
import { NotFoundPage } from "@/pages/errors/NotFoundPage";

export const router = createBrowserRouter([
    {
        element: <DashboardLayout />,
        children: [
            {
                index: true,
                element: <DashboardPage />,
            },
            {
                path: "projects",
                element: <ProjectsPage />,
            },
        ],
    },
    {
        path: "*",
        element: <NotFoundPage />,
    },
]);
