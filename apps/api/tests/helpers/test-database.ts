import { prisma } from "../../src/config/database.js";

export { prisma };

const createdUserIds = new Set<string>();
const createdProjectIds = new Set<string>();

export function trackUser(id: string) {
    createdUserIds.add(id);
}

export function trackProject(id: string) {
    createdProjectIds.add(id);
}

function assertTestDatabase(): void {
    const databaseUrl = process.env.DATABASE_URL;
    const expected = process.env.TEST_DATABASE_URL;

    if (
        process.env.NODE_ENV !== "test" ||
        !databaseUrl ||
        !expected ||
        databaseUrl !== expected
    ) {
        throw new Error(
            "Refusing cleanup: test database environment is not configured",
        );
    }

    let url: URL;
    try {
        url = new URL(databaseUrl);
    } catch {
        throw new Error("Refusing cleanup: invalid test database URL");
    }

    if (
        !["postgresql:", "postgres:"].includes(url.protocol) ||
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        decodeURIComponent(url.pathname.slice(1)) !== "devflow_test"
    ) {
        throw new Error("Refusing cleanup on a non-test database");
    }
}

export async function cleanupTestData() {
    // Check before any database mutation. The runtime Prisma module checks too.
    assertTestDatabase();

    const projectIds = [...createdProjectIds];
    const userIds = [...createdUserIds];

    await prisma.$transaction(async (tx) => {
        if (projectIds.length > 0) {
            // Notification.projectId is a scalar, not a foreign key to Project.
            await tx.notification.deleteMany({
                where: { projectId: { in: projectIds } },
            });

            await tx.activityLog.deleteMany({
                where: { projectId: { in: projectIds } },
            });

            await tx.comment.deleteMany({
                where: {
                    task: {
                        projectId: { in: projectIds },
                    },
                },
            });

            await tx.task.deleteMany({
                where: { projectId: { in: projectIds } },
            });

            await tx.projectMember.deleteMany({
                where: { projectId: { in: projectIds } },
            });

            await tx.project.deleteMany({
                where: { id: { in: projectIds } },
            });
        }

        if (userIds.length > 0) {
            // Also remove notifications sent by test users to other test users.
            await tx.notification.deleteMany({
                where: {
                    OR: [
                        { userId: { in: userIds } },
                        { actorId: { in: userIds } },
                    ],
                },
            });

            await tx.refreshToken.deleteMany({
                where: { userId: { in: userIds } },
            });

            await tx.user.deleteMany({
                where: { id: { in: userIds } },
            });
        }
    });

    // Preserve IDs if the transaction fails, so a later cleanup can retry.
    createdProjectIds.clear();
    createdUserIds.clear();
}
