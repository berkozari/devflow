
import * as React from "react";
import {
    Controller,
    FormProvider,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

import {
    FormFieldContext,
    FormItemContext,
    useFormField,
} from "./use-form-field";

const Form = FormProvider;

function FormField<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
>({
    ...props
}: ControllerProps<TFieldValues, TName>) {
    return (
        <FormFieldContext.Provider
            value={{ name: props.name }}
        >
            <Controller {...props} />
        </FormFieldContext.Provider>
    );
}

function FormItem({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const id = React.useId();

    return (
        <FormItemContext.Provider value={{ id }}>
            <div
                className={cn("space-y-2", className)}
                {...props}
            />
        </FormItemContext.Provider>
    );
}

function FormLabel({
    className,
    ...props
}: React.ComponentProps<typeof Label>) {
    const { error, formItemId } = useFormField();

    return (
        <Label
            className={cn(
                error && "text-destructive",
                className,
            )}
            htmlFor={formItemId}
            {...props}
        />
    );
}

function FormControl({
    ...props
}: React.ComponentProps<"div">) {
    const {
        error,
        formItemId,
        formDescriptionId,
        formMessageId,
    } = useFormField();

    return (
        <div
            id={formItemId}
            aria-describedby={
                error
                    ? `${formDescriptionId} ${formMessageId}`
                    : formDescriptionId
            }
            aria-invalid={!!error}
            {...props}
        />
    );
}

function FormDescription({
    className,
    ...props
}: React.ComponentProps<"p">) {
    const { formDescriptionId } = useFormField();

    return (
        <p
            id={formDescriptionId}
            className={cn(
                "text-sm text-muted-foreground",
                className,
            )}
            {...props}
        />
    );
}

function FormMessage({
    className,
    ...props
}: React.ComponentProps<"p">) {
    const { error, formMessageId } = useFormField();

    const body = error
        ? String(error.message ?? "")
        : props.children;

    if (!body) {
        return null;
    }

    return (
        <p
            id={formMessageId}
            role="alert"
            className={cn(
                "text-sm font-medium text-destructive",
                className,
            )}
            {...props}
        >
            {body}
        </p>
    );
}

export {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
};
