
import * as React from "react";
import {
    Controller,
    FormProvider,
    useFormContext,
    useFormState,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

import { Slot } from "radix-ui";

const Form = FormProvider;

type FormFieldContextValue<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
> = {
    name: TName;
};

const FormFieldContext =
    React.createContext<FormFieldContextValue<
        FieldValues,
        FieldPath<FieldValues>
    > | null>(null);

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

function useFormField() {
    const fieldContext = React.useContext(FormFieldContext);
    const itemContext = React.useContext(FormItemContext);

    const { getFieldState } = useFormContext();
    const formState = useFormState({
        name: fieldContext?.name,
    });

    if (!fieldContext || !itemContext) {
        throw new Error(
            "useFormField must be used within FormField and FormItem",
        );
    }

    const fieldState = getFieldState(
        fieldContext.name,
        formState,
    );

    return {
        id: itemContext.id,
        name: fieldContext.name,
        formItemId: `${itemContext.id}-form-item`,
        formDescriptionId: `${itemContext.id}-form-item-description`,
        formMessageId: `${itemContext.id}-form-item-message`,
        ...fieldState,
    };
}

type FormItemContextValue = {
    id: string;
};

const FormItemContext =
    React.createContext<FormItemContextValue | null>(null);

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
}: React.ComponentProps<typeof Slot.Root>) {
    const {
        error,
        formItemId,
        formDescriptionId,
        formMessageId,
    } = useFormField();

    const describedBy = error
        ? `${formDescriptionId} ${formMessageId}`
        : formDescriptionId;

    return (
        <Slot.Root
            id={formItemId}
            aria-describedby={describedBy}
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

    if (!body) return null;

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
    useFormField,
};
