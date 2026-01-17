import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { canAddImage } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        images: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project.images);
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const user = await currentUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if project exists and belongs to user
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can add more images
    const canAdd = await canAddImage(params.id);
    if (!canAdd) {
      return NextResponse.json(
        {
          error: "You have reached your image limit for this project.",
        },
        { status: 403 },
      );
    }

    // Handle both JSON and FormData requests
    let imageUrl: string | null = null;
    const contentType = request.headers.get("content-type");

    try {
      if (contentType?.includes("application/json")) {
        const body = await request.json();
        console.log("Received JSON body:", body);
        imageUrl = body.imageUrl;
      } else if (contentType?.includes("multipart/form-data")) {
        const formData = await request.formData();
        imageUrl = formData.get("imageUrl") as string;
      } else {
        console.error("Unsupported content type:", contentType);
        return NextResponse.json(
          { error: "Unsupported content type" },
          { status: 400 },
        );
      }
    } catch (error) {
      console.error("Error parsing request:", error);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 },
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 },
      );
    }

    console.log("Creating image record with URL:", imageUrl);

    const image = await prisma.image.create({
      data: {
        url: imageUrl.toString(),
        projectId: params.id,
      },
    });

    return NextResponse.json(image);
  } catch (error) {
    console.error("Error creating image record:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create image record",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageId } = await request.json();

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 },
      );
    }

    // Verify image ownership
    const imageWithProject = await prisma.image.findFirst({
      where: {
        id: imageId,
        project: {
          userId: user.id,
        },
      },
      include: {
        project: true,
      },
    });

    if (!imageWithProject) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete the image file
    await del(imageWithProject.url);

    // Delete the image record
    await prisma.image.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 },
    );
  }
}
