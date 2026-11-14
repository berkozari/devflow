
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import type { ProjectDetail } from "../types/project.types";

import {
    updateProjectSchema,
    type UpdateProjectFormValues,
} from "../schemas/project.schema";

interface ProjectSettingsFormProps {
    project: ProjectDetail;
    onSubmit: (values: UpdateProjectFormValues) => Promise<void>;
    isSubmitting?: boolean;
    canEdit?: boolean;
}

export function ProjectSettingsForm({
    project,
    onSubmit,
    isSubmitting = false,
    canEdit = true,
}: ProjectSettingsFormProps) {
    const form = useForm<UpdateProjectFormValues>({
        resolver: zodResolver(updateProjectSchema),
        defaultValues: {
            name: project.name,
            description: project.description ?? "",
            status: project.status,
        },
    });

    const handleSubmit = form.handleSubmit(async (values) => {
        await onSubmit(values);
    });

    return (
        <Form {...form}>
            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Project Name</FormLabel>

                            <FormControl>
                                <Input
                                    {...field}
                                    maxLength={100}
                                    disabled={!canEdit || isSubmitting}
                                    placeholder="Enter project name"
                                />
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>

                            <FormControl>
                                <Textarea
                                    {...field}
                                    value={field.value ?? ""}
                                    rows={5}
                                    maxLength={1000}
                                    disabled={!canEdit || isSubmitting}
                                    placeholder="Describe your project"
                                />
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Project Status</FormLabel>

                            <FormControl>
                                <select
                                    {...field}
                                    disabled={!canEdit || isSubmitting}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="PLANNING">
                                        Planning
                                    </option>

                                    <option value="ACTIVE">
                                        Active
                                    </option>

                                    <option value="COMPLETED">
                                        Completed
                                    </option>

                                    <option value="ARCHIVED">
                                        Archived
                                    </option>
                                </select>
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={
                            !canEdit ||
                            isSubmitting ||
                            !form.formState.isDirty
                        }
                    >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
