
import { useState } from "react";

import type {
    DashboardFilters as DashboardFiltersType,
    DashboardDatePreset,
    DashboardProject,
} from "../types/dashboard.types";

interface DashboardFiltersProps {
    filters: DashboardFiltersType;
    projects: DashboardProject[];
    onChange: (filters: DashboardFiltersType) => void;
}

type Preset = DashboardDatePreset | "custom";

function formatDateInput(date?: string) {
    if (!date) return "";

    return date.slice(0, 10);
}

function getLocalDateString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function createDateRange(days: number) {
    const endDate = new Date();
    const startDate = new Date();

    startDate.setDate(startDate.getDate() - (days - 1));

    return {
        startDate: getLocalDateString(startDate),
        endDate: getLocalDateString(endDate),
    };
}

function toStartOfDay(date: string) {
    return new Date(`${date}T00:00:00`).toISOString();
}

function toEndOfDay(date: string) {
    return new Date(`${date}T23:59:59.999`).toISOString();
}

export function DashboardFilters({
    filters,
    projects,
    onChange,
}: DashboardFiltersProps) {
    const [customSelected, setCustomSelected] = useState(false);

    const hasDateFilters = Boolean(
        filters.startDate || filters.endDate,
    );

    const preset: Preset = hasDateFilters
        ? "custom"
        : customSelected
            ? "custom"
            : "all";

    function handlePresetChange(value: Preset) {
        if (value === "all") {
            setCustomSelected(false);

            onChange({
                projectId: filters.projectId,
            });

            return;
        }

        if (value === "custom") {
            setCustomSelected(true);
            return;
        }

        setCustomSelected(false);

        const days = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
        }[value];

        const range = createDateRange(days);

        onChange({
            ...filters,
            startDate: toStartOfDay(range.startDate),
            endDate: toEndOfDay(range.endDate),
        });
    }

    function handleStartDateChange(value: string) {
        setCustomSelected(true);

        onChange({
            ...filters,
            startDate: value ? toStartOfDay(value) : undefined,
        });
    }

    function handleEndDateChange(value: string) {
        setCustomSelected(true);

        onChange({
            ...filters,
            endDate: value ? toEndOfDay(value) : undefined,
        });
    }

    function handleProjectChange(value: string) {
        onChange({
            ...filters,
            projectId: value || undefined,
        });
    }

    function handleClear() {
        setCustomSelected(false);
        onChange({});
    }

    return (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid flex-1 gap-2 sm:max-w-xs">
                    <label
                        htmlFor="dashboard-project"
                        className="text-sm font-medium"
                    >
                        Project
                    </label>

                    <select
                        id="dashboard-project"
                        value={filters.projectId ?? ""}
                        onChange={(event) =>
                            handleProjectChange(event.target.value)
                        }
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                        <option value="">All projects</option>

                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    onClick={handleClear}
                    className="h-10 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                    Clear filters
                </button>
            </div>

            <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">
                    Date range
                </span>

                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            ["7d", "Last 7 days"],
                            ["30d", "Last 30 days"],
                            ["90d", "Last 90 days"],
                            ["all", "All time"],
                            ["custom", "Custom"],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => handlePresetChange(value)}
                            aria-pressed={preset === value}
                            className={`rounded-md border px-3 py-2 text-sm transition-colors ${preset === value
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {preset === "custom" && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <label
                            htmlFor="dashboard-start-date"
                            className="text-sm font-medium"
                        >
                            Start date
                        </label>

                        <input
                            id="dashboard-start-date"
                            type="date"
                            value={formatDateInput(filters.startDate)}
                            max={formatDateInput(filters.endDate) || undefined}
                            onChange={(event) =>
                                handleStartDateChange(event.target.value)
                            }
                            className="h-10 rounded-md border bg-background px-3 text-sm"
                        />
                    </div>

                    <div className="grid gap-2">
                        <label
                            htmlFor="dashboard-end-date"
                            className="text-sm font-medium"
                        >
                            End date
                        </label>

                        <input
                            id="dashboard-end-date"
                            type="date"
                            value={formatDateInput(filters.endDate)}
                            min={formatDateInput(filters.startDate) || undefined}
                            onChange={(event) =>
                                handleEndDateChange(event.target.value)
                            }
                            className="h-10 rounded-md border bg-background px-3 text-sm"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
