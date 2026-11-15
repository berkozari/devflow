import { prisma } from "../config/database.js";
import { Prisma, type TaskStatus } from "../generated/prisma/client.js";

import type {
    CreateTaskInput,
    UpdateTaskInput,
    TaskQuery,
} from "../schemas/task.schema.js";

type TaskPositionUpdate = {
    id: string;
    status: TaskStatus;
    position: number;
    completedAt?: Date | null;
};

export const taskRepository = {
    // Every operation that changes a project's Kanban ordering acquires this
    // row lock first, within the same database transaction.
    async lockProjectTaskOrdering(
        projectId: string,
        tx: Prisma.TransactionClient,
    ): Promise<boolean> {
        const rows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT "id"
            FROM "Project"
            WHERE "id" = ${projectId}::uuid
            FOR NO KEY UPDATE
        `;

        return rows.length === 1;
    },

    create(
        projectId: string,
        creatorId: string,
        data: CreateTaskInput,
        position: number,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.create({
            data: {
                title: data.title,
                description: data.description,
                status: data.status,
                priority: data.priority,
                assigneeId: data.assigneeId,
                dueDate: data.dueDate
                    ? new Date(data.dueDate)
                    : data.dueDate,
                position,
                projectId,
                creatorId,
            },
            include: {
                assignee: {
                    select: { id: true, name: true, email: true },
                },
                creator: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    },

    findById(
        projectId: string,
        taskId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.findFirst({
            where: { id: taskId, projectId },
            include: {
                assignee: {
                    select: { id: true, name: true, email: true },
                },
                creator: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    },

    async findMany(projectId: string, query: TaskQuery) {
        const {
            page,
            limit,
            status,
            priority,
            assigneeId,
            search,
            sortBy,
            sortOrder,
        } = query;

        const where = {
            projectId,
            ...(status && { status }),
            ...(priority && { priority }),
            ...(assigneeId && { assigneeId }),
            ...(search && {
                OR: [
                    {
                        title: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                    {
                        description: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                ],
            }),
        };

        const [tasks, total] = await prisma.$transaction([
            prisma.task.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    { [sortBy]: sortOrder },
                    { id: "asc" },
                ],
                include: {
                    assignee: {
                        select: { id: true, name: true, email: true },
                    },
                    creator: {
                        select: { id: true, name: true, email: true },
                    },
                },
            }),
            prisma.task.count({ where }),
        ]);

        return { tasks, total };
    },

    findPositionById(
        projectId: string,
        taskId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.findFirst({
            where: { id: taskId, projectId },
            select: {
                id: true,
                status: true,
                position: true,
                assigneeId: true,
                completedAt: true,
            },
        });
    },

    findUpdatedById(
        projectId: string,
        taskId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.findFirst({
            where: { id: taskId, projectId },
            include: {
                assignee: {
                    select: { id: true, name: true, email: true },
                },
                creator: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    },

    findByStatus(
        projectId: string,
        status: TaskStatus,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.findMany({
            where: { projectId, status },
            orderBy: [
                { position: "asc" },
                { id: "asc" },
            ],
            select: { id: true, position: true },
        });
    },

    getLastPosition(
        projectId: string,
        status: TaskStatus,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.findFirst({
            where: { projectId, status },
            orderBy: [
                { position: "desc" },
                { id: "desc" },
            ],
            select: { position: true },
        });
    },

    updatePositions(
        projectId: string,
        updates: TaskPositionUpdate[],
        tx: Prisma.TransactionClient,
    ) {
        if (updates.length === 0) {
            return Promise.resolve(0);
        }

        const values = updates.map((item) =>
            Prisma.sql`(
                ${item.id}::uuid,
                ${item.status}::"TaskStatus",
                ${item.position}::double precision,
                ${item.completedAt !== undefined},
                ${item.completedAt ?? null}::timestamp
            )`,
        );

        return tx.$executeRaw(Prisma.sql`
            UPDATE "Task" AS task
            SET
                "status" = v.status,
                "position" = v.position,
                "completedAt" = CASE
                    WHEN v.update_completed_at
                    THEN v.completed_at
                    ELSE task."completedAt"
                END,
                "updatedAt" = CURRENT_TIMESTAMP
            FROM (
                VALUES ${Prisma.join(values)}
            ) AS v(
                id,
                status,
                position,
                update_completed_at,
                completed_at
            )
            WHERE task.id = v.id
              AND task."projectId" = ${projectId}::uuid
        `);
    },

    // Status and position are intentionally handled by updatePositions().
    update(
        projectId: string,
        taskId: string,
        data: Omit<UpdateTaskInput, "status">,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.updateMany({
            where: { id: taskId, projectId },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && {
                    description: data.description,
                }),
                ...(data.priority !== undefined && {
                    priority: data.priority,
                }),
                ...(data.assigneeId !== undefined && {
                    assigneeId: data.assigneeId,
                }),
                ...(data.dueDate !== undefined && {
                    dueDate: data.dueDate
                        ? new Date(data.dueDate)
                        : null,
                }),
            },
        });
    },

    delete(
        projectId: string,
        taskId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? prisma;

        return db.task.deleteMany({
            where: { id: taskId, projectId },
        });
    },
};
