import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string; imageId: string }> },
) {
  const params = await props.params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify image ownership
    const imageWithProject = await prisma.image.findFirst({
      where: {
        id: params.imageId,
        projectId: params.id,
        project: {
          userId: user.id,
        },
      },
    });

    if (!imageWithProject) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 },
      );
    }

    // Delete the old image file
    try {
      await del(imageWithProject.url);
    } catch (error) {
      console.error("Error deleting old image:", error);
      // Continue even if old image deletion fails
    }

    // Update the image record
    const updatedImage = await prisma.image.update({
      where: { id: params.imageId },
      data: { url: imageUrl },
    });

    return NextResponse.json(updatedImage);
  } catch (error) {
    console.error("Error replacing image:", error);
    return NextResponse.json(
      { error: "Failed to replace image" },
      { status: 500 },
    );
  }
}
