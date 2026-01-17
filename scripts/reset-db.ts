import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("Starting database reset...");
  const prisma = new PrismaClient();

  try {
    // Delete in order of dependencies
    console.log("Deleting votes...");
    await prisma.vote.deleteMany();

    console.log("Deleting images...");
    await prisma.image.deleteMany();

    console.log("Deleting projects...");
    await prisma.project.deleteMany();

    console.log("Deleting users...");
    await prisma.user.deleteMany();

    console.log("Database reset completed successfully!");
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
