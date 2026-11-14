
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = {
    default:
        "border-transparent bg-primary text-primary-foreground",
    secondary:
        "border-transparent bg-secondary text-secondary-foreground",
    destructive:
        "border-transparent bg-destructive text-white",
    outline:
        "text-foreground",
} as const;

type BadgeVariant = keyof typeof badgeVariants;

interface BadgeProps
    extends React.ComponentProps<"span"> {
    variant?: BadgeVariant;
}

function Badge({
    className,
    variant = "default",
    ...props
}: BadgeProps) {
    return (
        <span
            data-slot="badge"
            className={cn(
                "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
                badgeVariants[variant],
                className,
            )}
            {...props}
        />
    );
}

export { Badge, badgeVariants };
