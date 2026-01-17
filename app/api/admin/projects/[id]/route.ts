import { NextResponse, NextRequest } from "next/server";
import { getUser, isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { del } from "@vercel/blob";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First, get the project with all its images
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        images: {
          select: {
            id: true,
            url: true,
          },
        },
        user: {
          select: { username: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log(
      `Admin ${user.username} is deleting project "${project.name}" (${id}) owned by ${project.user.username} with ${project.images.length} images`,
    );

    // Delete all files from blob storage
    if (project.images.length > 0) {
      await Promise.all(
        project.images.map(async (image) => {
          try {
            await del(image.url);
            console.log(`Deleted file from storage: ${image.url}`);
          } catch (error) {
            console.error(
              `Failed to delete file from storage: ${image.url}`,
              error,
            );
            // Continue with deletion even if some images fail to delete
          }
        }),
      );
    }

    // Delete all related data in a transaction
    await prisma.$transaction([
      // Delete all votes on project images
      prisma.vote.deleteMany({
        where: {
          image: {
            projectId: id,
          },
        },
      }),
      // Delete all project images
      prisma.image.deleteMany({
        where: {
          projectId: id,
        },
      }),
      // Delete the project
      prisma.project.delete({
        where: {
          id,
        },
      }),
    ]);

    console.log(`Successfully deleted project ${id} and all related data`);
    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Error deleting project" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.update({
      where: {
        id,
      },
      data: {
        name,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Error updating project" },
      { status: 500 },
    );
  }
}
