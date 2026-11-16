import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
}));

vi.mock("@/services/api", () => ({ apiClient: http }));

import { authService } from "@/features/auth/services/auth.service";
import { userService } from "@/features/auth/services/user.service";

const user = { id: "user-id", name: "Dev User", email: "dev@example.com" };

beforeEach(() => {
    vi.resetAllMocks();
});

describe("authService", () => {
    it("sends login credentials and returns the unwrapped token and user", async () => {
        const payload = { email: user.email, password: "password123" };
        const result = { accessToken: "token-1", user };
        http.post.mockResolvedValue({ data: { success: true, data: result } });

        await expect(authService.login(payload)).resolves.toEqual(result);
        expect(http.post).toHaveBeenCalledWith("/auth/login", payload);
    });

    it("registers a user and unwraps the response", async () => {
        const payload = { name: user.name, email: user.email, password: "password123" };
        http.post.mockResolvedValue({ data: { success: true, data: user } });

        await expect(authService.register(payload)).resolves.toEqual(user);
        expect(http.post).toHaveBeenCalledWith("/auth/register", payload);
    });

    it("logs out without supplying tokens in the request body", async () => {
        http.post.mockResolvedValue({ status: 200 });
        await expect(authService.logout()).resolves.toBeUndefined();
        expect(http.post).toHaveBeenCalledWith("/auth/logout");
    });

    it("propagates login failures", async () => {
        const error = new Error("Unauthorized");
        http.post.mockRejectedValue(error);
        await expect(authService.login({ email: user.email, password: "invalid" }))
            .rejects.toBe(error);
    });

    it("propagates registration failures", async () => {
        const error = new Error("Conflict");
        http.post.mockRejectedValue(error);
        await expect(authService.register({ name: user.name, email: user.email, password: "password123" }))
            .rejects.toBe(error);
    });
});

describe("userService", () => {
    it("loads the current user and unwraps its response", async () => {
        http.get.mockResolvedValue({ data: { success: true, data: user } });
        await expect(userService.getMe()).resolves.toEqual(user);
        expect(http.get).toHaveBeenCalledWith("/users/me");
    });

    it("propagates current-user request errors", async () => {
        const error = new Error("Session expired");
        http.get.mockRejectedValue(error);
        await expect(userService.getMe()).rejects.toBe(error);
    });
});
