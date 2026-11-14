
import { z } from "zod";

export const dashboardQuerySchema = z.object({
    projectId: z.string().uuid().optional(),

    startDate: z.iso.datetime().optional(),

    endDate: z.iso.datetime().optional(),
}).refine(
    (data) => {
        if (!data.startDate || !data.endDate) {
            return true;
        }

        return new Date(data.startDate) <= new Date(data.endDate);
    },
    {
        message: "Start date must be before or equal to end date",
        path: ["endDate"],
    },
);

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
