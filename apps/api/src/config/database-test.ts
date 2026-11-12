import { prisma } from "./database.js";

async function main() {
    await prisma.$connect();

    console.log("Database connected successfully!");

    const users = await prisma.user.findMany();

    console.log("Users:", users);
}

main()
    .catch((error: unknown) => {
        console.error("Database connection failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });