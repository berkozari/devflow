
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

import {
    createProjectSchema,
    type CreateProjectFormValues,
} from "../schemas/project.schema";

interface CreateProjectFormProps {
    onSubmit: (values: CreateProjectFormValues) => void;
    isSubmitting?: boolean;
}

export function CreateProjectForm({
    onSubmit,
    isSubmitting = false,
}: CreateProjectFormProps) {
    const form = useForm<CreateProjectFormValues>({
        resolver: zodResolver(createProjectSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    const handleSubmit = form.handleSubmit(async (values) => {
        await onSubmit(values);
        form.reset();
    });

    return (
        <Form {...form}>
            <form
                onSubmit={handleSubmit}
                className="space-y-5"
            >
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Project Name</FormLabel>

                            <FormControl>
                                <Input
                                    placeholder="Enter project name"
                                    disabled={isSubmitting}
                                    autoComplete="off"
                                    maxLength={100}
                                    {...field}
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
                                    placeholder="Describe your project"
                                    rows={4}
                                    maxLength={1000}
                                    disabled={isSubmitting}
                                    {...field}
                                    value={field.value ?? ""}
                                />
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button
                    type="submit"
                    disabled={isSubmitting || !form.formState.isDirty}
                    className="w-full"
                >
                    {isSubmitting
                        ? "Creating..."
                        : "Create Project"}
                </Button>
            </form>
        </Form>
    );
}
