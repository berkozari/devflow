
import {
    beforeEach,
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const {
    PrismaPgMock,
    PrismaClientMock,
} = vi.hoisted(() => ({
    PrismaPgMock: vi.fn(),
    PrismaClientMock: vi.fn(),
}));

vi.mock("dotenv/config", () => ({}));

vi.mock("@prisma/adapter-pg", () => ({
    PrismaPg: PrismaPgMock,
}));

vi.mock("../../../src/generated/prisma/client.js", () => ({
    PrismaClient: PrismaClientMock,
}));

describe("Database Configuration", () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        delete process.env.DATABASE_URL;
    });

    afterEach(() => {
        if (originalDatabaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = originalDatabaseUrl;
        }
    });

    it("should throw error when DATABASE_URL is missing", async () => {
        await expect(
            import("../../../src/config/database.js"),
        ).rejects.toThrow("DATABASE_URL is not configured");

        expect(PrismaPgMock).not.toHaveBeenCalled();
        expect(PrismaClientMock).not.toHaveBeenCalled();
    });

    it("should block a development database in test mode", async () => {
        process.env.DATABASE_URL =
            "postgresql://user:password@localhost:5432/devflow";

        await expect(
            import("../../../src/config/database.js"),
        ).rejects.toThrow("Test DATABASE_URL must match TEST_DATABASE_URL");

        expect(PrismaPgMock).not.toHaveBeenCalled();
        expect(PrismaClientMock).not.toHaveBeenCalled();
    });

    it("should initialize Prisma with PostgreSQL adapter", async () => {
        // Use the configured, validated test DB URL, never an arbitrary URL.
        process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

        expect(process.env.DATABASE_URL).toBeTruthy();

        const mockAdapter = { adapter: true };
        const mockPrisma = { prisma: true };

        PrismaPgMock.mockImplementation(function () {
            return mockAdapter;
        });

        PrismaClientMock.mockImplementation(function () {
            return mockPrisma;
        });

        const { prisma } = await import(
            "../../../src/config/database.js"
        );

        expect(PrismaPgMock).toHaveBeenCalledWith({
            connectionString: process.env.DATABASE_URL,
        });

        expect(PrismaClientMock).toHaveBeenCalledWith({
            adapter: mockAdapter,
        });

        expect(prisma).toBe(mockPrisma);
    });
});
