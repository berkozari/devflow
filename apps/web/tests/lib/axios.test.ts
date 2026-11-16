import {
    AxiosError,
    AxiosHeaders,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Client = typeof import("@/lib/axios")["apiClient"];
type AuthStoreHook = typeof import("@/stores/auth.store")["useAuthStore"];
type RequestConfig = InternalAxiosRequestConfig;
type HttpHandler = (config: RequestConfig) => Promise<AxiosResponse>;

let client: Client;
let useAuthStore: AuthStoreHook;
let calls: RequestConfig[];
let handleRequest: HttpHandler;

function ok(config: RequestConfig, data: unknown): AxiosResponse {
    return {
        data,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
        config,
    };
}

function fail(config: RequestConfig, status: number, data: unknown): never {
    throw new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined, {
        data,
        status,
        statusText: "Error",
        headers: new AxiosHeaders(),
        config,
    });
}

function csrfResponse(config: RequestConfig, token = "csrf-token"): AxiosResponse {
    return ok(config, {
        success: true,
        message: "CSRF token generated",
        data: { csrfToken: token },
    });
}

beforeEach(async () => {
    // axios.ts keeps CSRF/refresh promises at module scope; always start clean.
    vi.resetModules();

    ({ apiClient: client } = await import("@/lib/axios"));
    ({ useAuthStore } = await import("@/stores/auth.store"));
    useAuthStore.getState().clearAuth();

    calls = [];
    handleRequest = async (config) =>
        config.url === "/auth/csrf-token"
            ? csrfResponse(config)
            : ok(config, { success: true });

    // This adapter replaces the transport: unit tests never access the network.
    client.defaults.adapter = vi.fn(async (config: RequestConfig) => {
        calls.push(config);
        return handleRequest(config);
    });
});

describe("apiClient", () => {
    it("uses credentialed API requests with a 10-second timeout", async () => {
        expect(client.defaults.withCredentials).toBe(true);
        expect(client.defaults.timeout).toBe(10_000);

        await client.get("/projects");

        expect(calls[0]?.headers.get("Accept")).toBe(
            "application/json",
        );
    });

    it("adds the access token to a safe GET without fetching CSRF", async () => {
        useAuthStore.getState().setAccessToken("access-123");

        await client.get("/projects");

        expect(calls).toHaveLength(1);
        expect(calls[0]?.url).toBe("/projects");
        expect(calls[0]?.headers.get("Authorization")).toBe("Bearer access-123");
        expect(calls[0]?.headers.get("X-CSRF-Token")).toBeFalsy();
    });

    it("fetches CSRF for unsafe requests and reuses it", async () => {
        await client.post("/projects", { name: "First" });
        await client.patch("/projects/1", { name: "Updated" });

        expect(calls.map((request) => request.url)).toEqual([
            "/auth/csrf-token",
            "/projects",
            "/projects/1",
        ]);
        expect(calls[1]?.headers.get("X-CSRF-Token")).toBe("csrf-token");
        expect(calls[2]?.headers.get("X-CSRF-Token")).toBe("csrf-token");
    });

    it("deduplicates concurrent CSRF lookups", async () => {
        await Promise.all([
            client.post("/projects", { name: "One" }),
            client.post("/projects", { name: "Two" }),
        ]);

        expect(calls.filter((request) => request.url === "/auth/csrf-token"))
            .toHaveLength(1);
        expect(calls.filter((request) => request.url === "/projects"))
            .toHaveLength(2);
    });

    it("refreshes the access token once after a 401 and retries the GET", async () => {
        useAuthStore.getState().setAccessToken("expired-token");
        let projectCalls = 0;

        handleRequest = async (config) => {
            if (config.url === "/auth/csrf-token") return csrfResponse(config);
            if (config.url === "/auth/refresh") {
                return ok(config, {
                    success: true,
                    data: {
                        accessToken: "new-access-token",
                        user: { id: "u1", name: "User", email: "user@example.test" },
                    },
                });
            }
            if (config.url === "/projects") {
                projectCalls += 1;
                if (projectCalls === 1) {
                    return fail(config, 401, { message: "Invalid access token" });
                }
                return ok(config, { data: ["project-1"] });
            }
            return ok(config, {});
        };

        const response = await client.get("/projects");

        expect(response.data).toEqual({ data: ["project-1"] });
        expect(projectCalls).toBe(2);
        expect(calls.filter((request) => request.url === "/auth/refresh"))
            .toHaveLength(1);
        expect(calls.filter((request) => request.url === "/auth/csrf-token"))
            .toHaveLength(1);
        expect(calls.findLast((request) => request.url === "/projects")?.headers.get("Authorization"))
            .toBe("Bearer new-access-token");
        expect(useAuthStore.getState().accessToken).toBe("new-access-token");
    });

    it("clears credentials if refresh fails", async () => {
        useAuthStore.getState().setAccessToken("expired-token");

        handleRequest = async (config) => {
            if (config.url === "/auth/csrf-token") return csrfResponse(config);
            if (config.url === "/auth/refresh") {
                return fail(config, 401, { message: "Refresh token expired" });
            }
            return fail(config, 401, { message: "Unauthorized" });
        };

        await expect(client.get("/projects")).rejects.toMatchObject({
            name: "ApiError",
            message: "Unauthorized",
            status: 401,
        });

        expect(useAuthStore.getState()).toMatchObject({
            accessToken: null,
            user: null,
            isAuthenticated: false,
        });
        expect(calls.filter((request) => request.url === "/auth/refresh"))
            .toHaveLength(1);
    });

    it("refreshes the CSRF token and retries one rejected mutation", async () => {
        let csrfCalls = 0;
        let mutationCalls = 0;

        handleRequest = async (config) => {
            if (config.url === "/auth/csrf-token") {
                csrfCalls += 1;
                return csrfResponse(config, `csrf-${csrfCalls}`);
            }
            mutationCalls += 1;
            if (mutationCalls === 1) {
                return fail(config, 403, {
                    message: "Invalid or missing CSRF token",
                });
            }
            return ok(config, { success: true });
        };

        await expect(client.post("/projects", { name: "Test" })).resolves
            .toMatchObject({ status: 200 });

        expect(csrfCalls).toBe(2);
        expect(mutationCalls).toBe(2);
        const posts = calls.filter((request) => request.url === "/projects");
        expect(posts[0]?.headers.get("X-CSRF-Token")).toBe("csrf-1");
        expect(posts[1]?.headers.get("X-CSRF-Token")).toBe("csrf-2");
    });

    it("does not retry a regular authorization failure", async () => {
        handleRequest = async (config) => {
            if (config.url === "/auth/csrf-token") return csrfResponse(config);
            return fail(config, 403, { message: "Forbidden" });
        };

        await expect(client.post("/projects", {})).rejects.toMatchObject({
            name: "ApiError",
            message: "Forbidden",
            status: 403,
        });
        expect(calls.filter((request) => request.url === "/projects"))
            .toHaveLength(1);
    });

    it("preserves structured validation errors", async () => {
        const errors = [{ field: "name", message: "Required" }];
        handleRequest = async (config) =>
            fail(config, 422, { message: "Validation failed", errors });

        await expect(client.get("/projects")).rejects.toMatchObject({
            name: "ApiError",
            status: 422,
            message: "Validation failed",
            errors,
        });
    });

    it("turns a timeout into a user-facing ApiError", async () => {
        handleRequest = async (config) => {
            throw new AxiosError("timeout", "ECONNABORTED", config);
        };

        await expect(client.get("/projects")).rejects.toMatchObject({
            name: "ApiError",
            message: "The request timed out.",
            code: "ECONNABORTED",
        });
    });

    it("turns network failures into a user-facing ApiError", async () => {
        handleRequest = async (config) => {
            throw new AxiosError("Network Error", "ERR_NETWORK", config);
        };

        await expect(client.get("/projects")).rejects.toMatchObject({
            name: "ApiError",
            message: "Unable to connect to the server.",
            code: "ERR_NETWORK",
        });
    });
});
