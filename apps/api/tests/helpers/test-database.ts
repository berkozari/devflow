
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

export async function cleanupTestData() {
    const projectIds = [...createdProjectIds];
    const userIds = [...createdUserIds];

    await prisma.$transaction(async (tx) => {
        if (projectIds.length > 0) {
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
            await tx.refreshToken.deleteMany({
                where: { userId: { in: userIds } },
            });

            await tx.user.deleteMany({
                where: { id: { in: userIds } },
            });
        }
    });

    createdProjectIds.clear();
    createdUserIds.clear();
}
