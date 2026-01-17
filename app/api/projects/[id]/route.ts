import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ImageWithVotes {
  id: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    votes: number;
  };
  votes: {
    liked: boolean;
  }[];
}

interface ImageBasic {
  id: string;
  url: string;
}

interface User {
  id: string;
  username: string;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const user = (await getUser()) as User | null;
    const userIsAdmin = user ? await isAdmin(user.id) : false;

    // First, get the project's user ID
    const projectUser = await prisma.project.findUnique({
      where: { id: params.id },
      select: { user: { select: { id: true } } },
    });

    if (!projectUser) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isOwner = user?.id === projectUser.user.id;
    const hasFullAccess = user && (userIsAdmin || isOwner);

    const project = await prisma.project.findUnique({
      where: {
        id: params.id,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        viewCount: true,
        images: {
          select: hasFullAccess
            ? {
                // Full data for project owner and admin
                id: true,
                url: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                  select: {
                    votes: true,
                  },
                },
                votes: {
                  select: {
                    liked: true,
                  },
                },
              }
            : {
                // Minimal data for anonymous users
                id: true,
                url: true,
              },
        },
        // Include user info to check ownership
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Transform the response based on user type
    const transformedProject = {
      id: project.id,
      name: project.name,
      totalImages: project.images.length,
      ...(hasFullAccess
        ? {
            createdAt: project.createdAt,
            viewCount: project.viewCount,
          }
        : {}),
      images: hasFullAccess
        ? (project.images as ImageWithVotes[]).map((image) => ({
            id: image.id,
            url: image.url,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt,
            votes: image.votes || [],
            stats: {
              total: image._count.votes,
              likes: (image.votes || []).filter((vote) => vote.liked).length,
              dislikes: (image.votes || []).filter((vote) => !vote.liked)
                .length,
            },
          }))
        : (project.images as ImageBasic[]).map((image) => ({
            id: image.id,
            url: image.url,
          })),
    };

    return NextResponse.json(transformedProject);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userIsAdmin = await isAdmin(user.id);
    // Verify project ownership or admin status
    const project = await prisma.project.findFirst({
      where: userIsAdmin
        ? { id: params.id }
        : {
            id: params.id,
            user: {
              id: user.id,
            },
          },
      include: {
        images: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete all images from blob storage if they exist
    if (project.images.length > 0) {
      await Promise.all(
        project.images.map(async (image) => {
          try {
            await del(image.url);
          } catch (error) {
            console.error(`Failed to delete image ${image.url}:`, error);
            // Continue with deletion even if some images fail to delete
          }
        }),
      );
    }

    // Delete all votes for this project's images
    await prisma.vote.deleteMany({
      where: {
        image: {
          projectId: params.id,
        },
      },
    });

    // Delete all images from the database
    await prisma.image.deleteMany({
      where: {
        projectId: params.id,
      },
    });

    // Delete the project
    await prisma.project.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userIsAdmin = await isAdmin(user.id);
    // Verify project ownership or admin status
    const project = await prisma.project.findFirst({
      where: userIsAdmin
        ? { id: params.id }
        : {
            id: params.id,
            user: {
              id: user.id,
            },
          },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Valid project name is required" },
        { status: 400 },
      );
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: { name: name.trim() },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}
