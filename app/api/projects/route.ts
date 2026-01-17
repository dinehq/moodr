import { NextRequest, NextResponse } from "next/server";
import { getUser, isAdmin } from "@/lib/auth";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { canCreateProject } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can create more projects
    const canCreate = await canCreateProject(userId);
    if (!canCreate) {
      return NextResponse.json(
        {
          error: "You have reached your project limit.",
        },
        { status: 403 },
      );
    }

    // Handle both form data and JSON requests
    let name: string | null = null;
    const contentType = req.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const body = await req.json();
      name = body.name;
    } else if (contentType?.includes("multipart/form-data")) {
      const formData = await req.formData();
      name = formData.get("name") as string;
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        userId,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("user");

    // If username is provided, verify admin access
    if (username && !(await isAdmin(user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If username is provided and user is admin, fetch that user's projects
    const whereClause = username
      ? {
          user: {
            username,
          },
        }
      : {
          userId: user.id,
        };

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        images: {
          select: {
            id: true,
            url: true,
            votes: {
              select: {
                liked: true,
              },
            },
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the response to include vote stats
    const transformedProjects = projects.map((project) => {
      // Calculate total votes for all images in the project
      const totalVotes = project.images.reduce(
        (sum, img) => sum + img._count.votes,
        0,
      );

      return {
        ...project,
        totalVotes,
        totalImages: project.images.length,
        images: project.images.slice(0, 4).map((image) => ({
          id: image.id,
          url: image.url,
          stats: {
            total: image._count.votes,
            likes: image.votes.filter((vote) => vote.liked).length,
            dislikes: image.votes.filter((vote) => !vote.liked).length,
          },
        })),
      };
    });

    return NextResponse.json(transformedProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Error fetching projects" },
      { status: 500 },
    );
  }
}
