import { list, del } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import path from "path";
import readline from "readline";

// Load environment variables from .env.local in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
}

const prisma = new PrismaClient();

function askForConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + " (y/N): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function cleanupOrphanedBlobs() {
  try {
    console.log("Starting blob cleanup...");

    // Get all valid image URLs from the database
    const images = await prisma.image.findMany({
      select: {
        url: true,
      },
    });

    const validUrls = new Set(images.map((img: { url: string }) => img.url));
    console.log(`Found ${validUrls.size} valid image URLs in database`);

    // List all blobs
    const { blobs } = await list();
    console.log(`Found ${blobs.length} blobs in storage`);

    // Find orphaned blobs (those not in the database)
    const orphanedBlobs = blobs.filter((blob) => !validUrls.has(blob.url));
    console.log(`Found ${orphanedBlobs.length} orphaned blobs`);

    if (orphanedBlobs.length === 0) {
      console.log("No orphaned blobs found. Exiting...");
      return;
    }

    // Show orphaned blobs and ask for confirmation
    console.log("\nOrphaned blobs to be deleted:");
    orphanedBlobs.forEach((blob) => console.log(`- ${blob.pathname}`));

    const confirmed = await askForConfirmation(
      `\nAre you sure you want to delete these ${orphanedBlobs.length} blobs?`,
    );

    if (!confirmed) {
      console.log("Operation cancelled.");
      return;
    }

    // Delete orphaned blobs
    console.log("\nDeleting orphaned blobs...");
    let deletedCount = 0;

    for (const blob of orphanedBlobs) {
      try {
        await del(blob.url);
        deletedCount++;
        console.log(`Deleted blob: ${blob.pathname}`);
      } catch (error) {
        console.error(`Failed to delete blob ${blob.pathname}:`, error);
      }
    }

    console.log(`Successfully deleted ${deletedCount} orphaned blobs`);
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupOrphanedBlobs();
