import type { Server } from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";

let server: Server | undefined;

const startServer = async () => {
    try {
        await prisma.$connect();

        console.log("Database connected successfully!");

        server = app.listen(env.port, () => {
            console.log(`Server running on port ${env.port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        await prisma.$disconnect();
        process.exit(1);
    }
};

const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down...`);

    if (server) {
        server.close(async () => {
            await prisma.$disconnect();
            console.log("Database disconnected.");
            process.exit(0);
        });
    } else {
        await prisma.$disconnect();
        process.exit(0);
    }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

startServer();