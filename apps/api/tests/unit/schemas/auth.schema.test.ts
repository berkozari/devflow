import { describe, expect, it } from "vitest";

import { registerSchema, loginSchema, } from "../../../src/schemas/auth.schema.js";

describe("Auth Schemas", () => {
    describe("registerSchema", () => {
        it("should accept valid registration data", () => {
            const result = registerSchema.safeParse({ name: "John Doe", email: "john@example.com", password: "password123", });

            expect(result.success).toBe(true);
        });

        it("should trim name and email", () => {
            const result = registerSchema.parse({
                name: "  John Doe  ",
                email: "  JOHN@EXAMPLE.COM  ",
                password: "password123",
            });

            expect(result.name).toBe("John Doe");
            expect(result.email).toBe("john@example.com");
        });

        it("should reject names shorter than 2 characters", () => {
            expect(
                registerSchema.safeParse({
                    name: "J",
                    email: "john@example.com",
                    password: "password123",
                }).success,
            ).toBe(false);
        });

        it("should reject names longer than 50 characters", () => {
            expect(
                registerSchema.safeParse({
                    name: "A".repeat(51),
                    email: "john@example.com",
                    password: "password123",
                }).success,
            ).toBe(false);
        });

        it("should reject invalid email addresses", () => {
            expect(
                registerSchema.safeParse({
                    name: "John Doe",
                    email: "invalid-email",
                    password: "password123",
                }).success,
            ).toBe(false);
        });

        it("should reject passwords shorter than 8 characters", () => {
            expect(
                registerSchema.safeParse({
                    name: "John Doe",
                    email: "john@example.com",
                    password: "1234567",
                }).success,
            ).toBe(false);
        });

        it("should reject passwords longer than 128 characters", () => {
            expect(
                registerSchema.safeParse({
                    name: "John Doe",
                    email: "john@example.com",
                    password: "A".repeat(129),
                }).success,
            ).toBe(false);
        });

        it("should reject missing required fields", () => {
            expect(
                registerSchema.safeParse({}).success,
            ).toBe(false);
        });
    });

    describe("loginSchema", () => {
        it("should accept valid login data", () => {
            expect(
                loginSchema.safeParse({
                    email: "john@example.com",
                    password: "password123",
                }).success,
            ).toBe(true);
        });

        it("should trim and lowercase email", () => {
            const result = loginSchema.parse({
                email: "  JOHN@EXAMPLE.COM  ",
                password: "password123",
            });

            expect(result.email).toBe("john@example.com");
        });

        it("should reject invalid email addresses", () => {
            expect(
                loginSchema.safeParse({
                    email: "invalid-email",
                    password: "password123",
                }).success,
            ).toBe(false);
        });

        it("should reject empty passwords", () => {
            expect(
                loginSchema.safeParse({
                    email: "john@example.com",
                    password: "",
                }).success,
            ).toBe(false);
        });

        it("should reject missing required fields", () => {
            expect(
                loginSchema.safeParse({}).success,
            ).toBe(false);
        });
    });


});