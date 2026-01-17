import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getUserRole } from "@/lib/auth";

export async function GET() {
  try {
    const user = await currentUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get project count
    const projectCount = await prisma.project.count({
      where: { userId },
    });

    // Get image count for each project
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            images: true,
          },
        },
      },
    });

    const imagesPerProject = Object.fromEntries(
      projects.map((project) => [project.id, project._count.images]),
    );

    // Get user's role
    const role = await getUserRole(userId);

    return NextResponse.json({
      projectCount,
      imagesPerProject,
      role,
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
