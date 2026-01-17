import { currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/express";
import prisma from "./prisma";
import { UserRole, ROLE_LIMITS } from "./types";

export async function getUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
    include: {
      _count: {
        select: {
          projects: true,
        },
      },
    },
  });

  if (!user) {
    // Create user in our database if they don't exist
    return await prisma.user.create({
      data: {
        id: clerkUser.id,
        username: clerkUser.username || `${clerkUser.id}`,
      },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });
  }

  return user;
}

export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    return (clerkUser.privateMetadata.role as UserRole) || "free";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "free"; // Default to free if there's an error
  }
}

export async function setUserRole(userId: string, role: UserRole) {
  try {
    await clerkClient.users.updateUser(userId, {
      privateMetadata: { role },
    });
  } catch (error) {
    console.error("Error setting user role:", error);
    throw new Error("Failed to update user role");
  }
}

export async function canCreateProject(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          projects: true,
        },
      },
    },
  });

  if (!user) return false;

  const role = await getUserRole(userId);
  const limits = ROLE_LIMITS[role];

  return user._count.projects < limits.maxProjects;
}

export async function canAddImage(projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: {
        select: {
          images: true,
        },
      },
      user: true,
    },
  });

  if (!project) return false;

  const role = await getUserRole(project.userId);
  const limits = ROLE_LIMITS[role];

  return project._count.images < limits.maxImagesPerProject;
}

export async function isAdmin(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  const role = await getUserRole(userId);
  return role === "admin";
}
