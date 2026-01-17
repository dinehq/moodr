import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const { like, imageId } = await request.json();

    if (!imageId || typeof like !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }

    // Verify the image belongs to this project
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        projectId: params.id,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Create new vote
    const vote = await prisma.vote.create({
      data: {
        imageId,
        projectId: params.id,
        liked: like,
      },
    });

    return NextResponse.json(vote);
  } catch (error) {
    // Safely log error details
    if (error instanceof Error) {
      console.error("Error creating vote:", error.message);
    } else {
      console.error("Unknown error creating vote");
    }

    // Handle any other errors
    return NextResponse.json(
      { error: "Failed to create vote" },
      { status: 500 },
    );
  }
}

// GET endpoint is no longer needed as we'll use localStorage for vote checking
