export type UserRole = "free" | "pro" | "admin";

export interface UserLimits {
  maxProjects: number;
  maxImagesPerProject: number;
}

export const ROLE_LIMITS: Record<UserRole, UserLimits> = {
  free: {
    maxProjects: 3,
    maxImagesPerProject: 10,
  },
  pro: {
    maxProjects: Infinity,
    maxImagesPerProject: Infinity,
  },
  admin: {
    maxProjects: Infinity,
    maxImagesPerProject: Infinity,
  },
};
