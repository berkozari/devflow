
import { z } from "zod";

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Invalid email address")
        .transform((value) => value.toLowerCase()),

    password: z
        .string()
        .min(1, "Password is required"),
});

export const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must contain at least 2 characters")
        .max(50, "Name cannot exceed 50 characters"),

    email: z
        .string()
        .trim()
        .email("Invalid email address")
        .transform((value) => value.toLowerCase()),

    password: z
        .string()
        .min(8, "Password must contain at least 8 characters")
        .max(128, "Password cannot exceed 128 characters"),
});

export type LoginFormValues = z.infer<
    typeof loginSchema
>;

export type RegisterFormValues = z.infer<
    typeof registerSchema
>;
