import { NextResponse } from "next/server";
import { getUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClerkClient } from "@clerk/backend";
import type { User } from "@clerk/backend";
import type { UserRole } from "@/lib/types";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function GET() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get Clerk user data first
    const { data: clerkUsers } = await clerk.users.getUserList({
      limit: 500,
    });
    const clerkUserIds = clerkUsers.map((user: User) => user.id);

    // Only fetch users that exist in Clerk
    const dbUsers = await prisma.user.findMany({
      where: {
        id: {
          in: clerkUserIds,
        },
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            viewCount: true,
            _count: {
              select: {
                images: true,
              },
            },
            images: {
              select: {
                url: true,
                votes: {
                  select: {
                    liked: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to include vote stats and Clerk user data
    const transformedUsers = dbUsers.map((dbUser) => {
      const clerkUser = clerkUsers.find((cu: User) => cu.id === dbUser.id);
      return {
        ...dbUser,
        firstName: clerkUser?.firstName || "",
        lastName: clerkUser?.lastName || "",
        imageUrl: clerkUser?.imageUrl,
        email: clerkUser?.emailAddresses[0]?.emailAddress,
        role: (clerkUser?.privateMetadata.role as UserRole) || "free",
        projects: dbUser.projects.map((project) => ({
          ...project,
          images: project.images.map((image) => ({
            ...image,
            _count: {
              votes: image.votes.length,
            },
            stats: {
              total: image.votes.length,
              likes: image.votes.filter((vote) => vote.liked).length,
              dislikes: image.votes.filter((vote) => !vote.liked).length,
            },
          })),
        })),
      };
    });

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
