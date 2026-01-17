import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    // Delete all votes for the project
    await prisma.vote.deleteMany({
      where: {
        projectId: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting project votes:", error);
    return NextResponse.json(
      { error: "Failed to reset project votes" },
      { status: 500 },
    );
  }
}
