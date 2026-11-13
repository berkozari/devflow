import * as React from "react";
import {
    useFormContext,
    useFormState,
    type FieldPath,
    type FieldValues,
} from "react-hook-form";

interface FormFieldContextValue<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
> {
    name: TName;
}

interface FormItemContextValue {
    id: string;
}

export const FormFieldContext =
    React.createContext<FormFieldContextValue<
        FieldValues,
        FieldPath<FieldValues>
    > | null>(null);

export const FormItemContext =
    React.createContext<FormItemContextValue | null>(null);

export function useFormField() {
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