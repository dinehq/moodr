import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    // Check if user is the project owner
    const user = await getUser();
    if (user) {
      const project = await prisma.project.findUnique({
        where: {
          id: params.id,
          userId: user.id,
        },
      });

      if (project) {
        // Skip counting view for project owners
        return NextResponse.json({ viewCount: project.viewCount });
      }
    }

    // Increment the view counter
    const updatedProject = await prisma.project.update({
      where: {
        id: params.id,
      },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: {
        viewCount: true,
      },
    });

    return NextResponse.json({ viewCount: updatedProject.viewCount });
  } catch (error) {
    console.error("Error recording view:", error);
    return NextResponse.json(
      { error: "Failed to record view" },
      { status: 500 },
    );
  }
}
