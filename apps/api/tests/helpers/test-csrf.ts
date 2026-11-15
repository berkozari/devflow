
import type { SuperAgentTest } from "supertest";

export async function getCsrfToken(
    agent: SuperAgentTest,
): Promise<string> {
    const response = await agent
        .get("/api/v1/csrf/csrf-token")
        .expect(200);

    const csrfToken = response.body.csrfToken;

    if (typeof csrfToken !== "string" || !csrfToken) {
        throw new Error("CSRF token not found");
    }

    return csrfToken;
}

export function createCsrfHeader(token: string) {
    return {
        "X-CSRF-Token": token,
    };
}
