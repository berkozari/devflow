import { describe, expect, it } from "vitest";

import {
    loginSchema as normalizedLoginSchema,
    registerSchema,
} from "@/features/auth/schemas/auth.schema";
import { loginSchema as formLoginSchema } from "@/features/auth/schemas/login.schema";

describe("Auth validation schemas", () => {
    describe("LoginForm loginSchema", () => {
        it("accepts a valid email/password pair", () => {
            expect(formLoginSchema.safeParse({
                email: "person@example.com",
                password: "correct-password",
            }).success).toBe(true);
        });

        it("trims email whitespace", () => {
            expect(formLoginSchema.parse({
                email: "  person@example.com  ",
                password: "secret",
            }).email).toBe("person@example.com");
        });

        it("rejects an invalid email", () => {
            const parsed = formLoginSchema.safeParse({ email: "not-email", password: "secret" });
            expect(parsed.success).toBe(false);
        });

        it("rejects an empty password", () => {
            const parsed = formLoginSchema.safeParse({ email: "person@example.com", password: "" });
            expect(parsed.success).toBe(false);
        });
    });

    describe("auth.schema loginSchema", () => {
        it("normalizes email case and whitespace", () => {
            expect(normalizedLoginSchema.parse({
                email: "  PERSON@Example.COM  ",
                password: "secret",
            })).toEqual({ email: "person@example.com", password: "secret" });
        });

        it("rejects missing password", () => {
            expect(normalizedLoginSchema.safeParse({
                email: "person@example.com", password: "",
            }).success).toBe(false);
        });
    });

    describe("registerSchema", () => {
        const valid = {
            name: "Developer",
            email: "developer@example.com",
            password: "secure-password",
        };

        it("trims name and normalizes email", () => {
            expect(registerSchema.parse({
                ...valid, name: "  Dev User  ", email: "  DEV@Example.COM  ",
            })).toEqual({ ...valid, name: "Dev User", email: "dev@example.com" });
        });

        it("accepts minimum name and password lengths", () => {
            expect(registerSchema.safeParse({ ...valid, name: "Al", password: "12345678" }).success)
                .toBe(true);
        });

        it("accepts maximum name and password lengths", () => {
            expect(registerSchema.safeParse({ ...valid, name: "A".repeat(50), password: "x".repeat(128) }).success)
                .toBe(true);
        });

        it.each([
            ["one-character name", { name: "A" }],
            ["name over 50 characters", { name: "A".repeat(51) }],
            ["invalid email", { email: "bad-email" }],
            ["password shorter than 8 characters", { password: "1234567" }],
            ["password longer than 128 characters", { password: "x".repeat(129) }],
        ])("rejects %s", (_case, override) => {
            expect(registerSchema.safeParse({ ...valid, ...override }).success).toBe(false);
        });
    });
});
