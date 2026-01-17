import { NextRequest, NextResponse } from "next/server";
import { isAdmin, setUserRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { del } from "@vercel/blob";
import { currentUser } from "@clerk/nextjs/server";
import type { UserRole } from "@/lib/types";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Don't allow deleting the admin user
    const targetUser = await prisma.user.findUnique({
      where: { id: id },
      include: {
        projects: {
          include: {
            images: {
              select: {
                url: true,
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (await isAdmin(targetUser.id)) {
      return NextResponse.json(
        { error: "Cannot delete admin user" },
        { status: 400 },
      );
    }

    console.log(`Admin ${user.username} is deleting user ${targetUser.id}`);

    // Delete all files from blob storage
    const allImages = targetUser.projects.flatMap((project) => project.images);
    console.log(`Deleting ${allImages.length} images from storage`);

    await Promise.all(
      allImages.map(async (image) => {
        try {
          await del(image.url);
          console.log(`Deleted file from storage: ${image.url}`);
        } catch (error) {
          console.error(
            `Failed to delete file from storage: ${image.url}`,
            error,
          );
        }
      }),
    );

    // Delete all related data
    await prisma.$transaction([
      // Delete all votes on user's project images
      prisma.vote.deleteMany({
        where: {
          image: {
            project: {
              userId: id,
            },
          },
        },
      }),
      // Delete all images in user's projects
      prisma.image.deleteMany({
        where: {
          project: {
            userId: id,
          },
        },
      }),
      // Delete all user's projects
      prisma.project.deleteMany({
        where: {
          userId: id,
        },
      }),
      // Finally, delete the user
      prisma.user.delete({
        where: {
          id: id,
        },
      }),
    ]);

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { role } = await request.json();

    if (!role || !["free", "pro", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: free, pro, admin" },
        { status: 400 },
      );
    }

    await setUserRole(id, role as UserRole);
    console.log(`Admin ${user.username} updated user ${id} role to ${role}`);

    return NextResponse.json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Error updating user role" },
      { status: 500 },
    );
  }
}
