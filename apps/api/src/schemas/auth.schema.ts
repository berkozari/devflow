
import { z } from "zod";

const emailSchema = z
    .string()
    .trim()
    .max(254, "Email cannot exceed 254 characters")
    .email("Invalid email address")
    .transform((value) => value.toLowerCase());

export const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must contain at least 2 characters")
        .max(50, "Name cannot exceed 50 characters"),

    email: emailSchema,

    password: z
        .string()
        .min(8, "Password must contain at least 8 characters")
        .max(128, "Password cannot exceed 128 characters"),
});

export const loginSchema = z.object({
    email: emailSchema,

    password: z
        .string()
        .min(1, "Password is required")
        .max(128, "Password cannot exceed 128 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
