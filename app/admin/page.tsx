"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Shield,
  Crown,
  Sparkles,
  ImageIcon,
  Eye,
  ThumbsUp,
  Users,
  ChevronDown,
  FolderKanban,
  Activity,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { UserRole } from "@/lib/types";
import Image from "next/image";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  viewCount: number;
  _count: {
    images: number;
  };
  images: {
    url: string;
    _count: {
      votes: number;
    };
    stats: {
      total: number;
      likes: number;
      dislikes: number;
    };
  }[];
}

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl: string;
  createdAt: string;
  role: UserRole;
  _count: {
    projects: number;
  };
  projects: Project[];
}

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  totalImages: number;
  totalViews: number;
  totalVotes: number;
  activeUsers: number;
}

type SortOption =
  | "username"
  | "projects"
  | "created"
  | "views"
  | "images"
  | "votes";

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalImages: 0,
    totalViews: 0,
    totalVotes: 0,
    activeUsers: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleUserProjects = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAllProjects = () => {
    setExpandedUsers((prev) => {
      if (prev.size > 0) {
        // If any are expanded, collapse all
        return new Set();
      } else {
        // Expand all users that have projects
        return new Set(
          users
            .filter((user) => user._count.projects > 0)
            .map((user) => user.id),
        );
      }
    });
  };

  useEffect(() => {
    // Update the DOM to reflect the expanded state
    users.forEach((user) => {
      const projectsEl = document.getElementById(`projects-${user.id}`);
      const iconEl = document.getElementById(`projects-icon-${user.id}`);
      if (projectsEl && iconEl) {
        const isExpanded = expandedUsers.has(user.id);
        projectsEl.style.display = isExpanded ? "block" : "none";
        iconEl.style.transform = isExpanded ? "rotate(180deg)" : "rotate(0deg)";
      }
    });
  }, [expandedUsers, users]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data);

      // Calculate dashboard stats
      const stats: DashboardStats = {
        totalUsers: data.length,
        totalProjects: data.reduce(
          (acc: number, user: User) => acc + user._count.projects,
          0,
        ),
        totalImages: data.reduce(
          (acc: number, user: User) =>
            acc +
            user.projects.reduce(
              (sum: number, project: Project) => sum + project._count.images,
              0,
            ),
          0,
        ),
        totalViews: data.reduce(
          (acc: number, user: User) =>
            acc +
            user.projects.reduce(
              (sum: number, project: Project) => sum + project.viewCount,
              0,
            ),
          0,
        ),
        totalVotes: data.reduce(
          (acc: number, user: User) =>
            acc +
            user.projects.reduce(
              (sum: number, project: Project) =>
                sum +
                project.images.reduce(
                  (imageSum: number, image) =>
                    imageSum + (image.stats?.total || 0),
                  0,
                ),
              0,
            ),
          0,
        ),
        activeUsers: data.filter((user: User) => user._count.projects > 0)
          .length,
      };
      setStats(stats);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch users",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (
    userId: string,
    username: string,
    projectCount: number,
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${username}"?\n\n` +
          `This will permanently delete:\n` +
          `- User account and profile\n` +
          `- ${projectCount} projects\n` +
          `- All associated images and votes\n\n` +
          `This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingUser(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      await fetchUsers();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete user",
      );
    } finally {
      setDeletingUser(null);
    }
  };

  const handleDeleteProject = async (
    projectId: string,
    projectName: string,
    imageCount: number,
    voteCount: number,
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to delete project "${projectName}"?\n\n` +
          `This will permanently delete:\n` +
          `- Project and all settings\n` +
          `- ${imageCount} images\n` +
          `- ${voteCount} votes\n\n` +
          `This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingProject(projectId);
    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete project");
      }

      await fetchUsers();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete project",
      );
    } finally {
      setDeletingProject(null);
    }
  };

  const handleUpdateRole = async (
    userId: string,
    newRole: UserRole,
    currentRole: UserRole,
    username: string,
  ) => {
    // Don't show confirmation if role hasn't changed
    if (newRole === currentRole) return;

    const roleDescriptions = {
      free: "Limited to 3 projects and 10 images per project",
      pro: "Unlimited projects and images",
      admin: "Full admin access, unlimited projects and images",
    };

    if (
      !window.confirm(
        `Are you sure you want to change ${username}'s role?\n\n` +
          `From: ${currentRole} (${roleDescriptions[currentRole]})\n` +
          `To: ${newRole} (${roleDescriptions[newRole]})\n\n` +
          `${newRole === "admin" ? "⚠️ WARNING: This will grant full administrative access to the system." : ""}`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user role");
      }

      await fetchUsers();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update user role",
      );
    }
  };

  const sortedAndFilteredUsers = users
    .filter((user) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        `${user.firstName} ${user.lastName}`
          .toLowerCase()
          .includes(searchLower) ||
        user.projects.some((project) =>
          project.name.toLowerCase().includes(searchLower),
        )
      );
    })
    .sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;

      switch (sortBy) {
        case "username":
          return a.username.localeCompare(b.username) * multiplier;

        case "projects":
          return (a._count.projects - b._count.projects) * multiplier;

        case "created":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            multiplier
          );

        case "views":
          const aViews = a.projects.reduce((sum, p) => sum + p.viewCount, 0);
          const bViews = b.projects.reduce((sum, p) => sum + p.viewCount, 0);
          return (aViews - bViews) * multiplier;

        case "images":
          const aImages = a.projects.reduce(
            (sum, p) => sum + p._count.images,
            0,
          );
          const bImages = b.projects.reduce(
            (sum, p) => sum + p._count.images,
            0,
          );
          return (aImages - bImages) * multiplier;

        case "votes":
          const aVotes = a.projects.reduce(
            (sum, p) =>
              sum +
              p.images.reduce((iSum, img) => iSum + (img.stats?.total || 0), 0),
            0,
          );
          const bVotes = b.projects.reduce(
            (sum, p) =>
              sum +
              p.images.reduce((iSum, img) => iSum + (img.stats?.total || 0), 0),
            0,
          );
          return (aVotes - bVotes) * multiplier;

        default:
          return 0;
      }
    });

  if (loading)
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );

  if (error)
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center">
        <div className="rounded-xl bg-red-50 p-6 text-red-600 shadow-lg">
          <div className="font-medium">Error</div>
          <div className="mt-1 text-sm">{error}</div>
        </div>
      </div>
    );

  return (
    <div className="min-h-[calc(100vh-65px)] py-6">
      <div className="container mx-auto px-4">
        {/* <div className="mb-6 sm:mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Admin Dashboard
          </h1>
        </div> */}

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-6">
          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-indigo-50 to-white p-4 shadow-xs transition-all sm:p-6">
            <div className="absolute top-0 right-0 p-2 text-indigo-200 sm:p-4">
              <Users className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <dt className="text-xs font-medium text-indigo-600 sm:text-sm">
              Users
            </dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-4xl">
              {stats.totalUsers}
            </dd>
            <div className="mt-1 text-xs text-indigo-600/70">
              {stats.activeUsers} active
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-purple-50 to-white p-4 shadow-xs transition-all sm:p-6">
            <div className="absolute top-0 right-0 p-2 text-purple-200 sm:p-4">
              <FolderKanban className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <dt className="text-xs font-medium text-purple-600 sm:text-sm">
              Projects
            </dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-4xl">
              {stats.totalProjects}
            </dd>
            <div className="mt-1 text-xs text-purple-600/70">
              {(stats.totalProjects / stats.activeUsers).toFixed(1)} per active
              user
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-pink-50 to-white p-4 shadow-xs transition-all sm:p-6">
            <div className="absolute top-0 right-0 p-2 text-pink-200 sm:p-4">
              <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <dt className="text-xs font-medium text-pink-600 sm:text-sm">
              Images
            </dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-4xl">
              {stats.totalImages}
            </dd>
            <div className="mt-1 text-xs text-pink-600/70">
              {(stats.totalImages / stats.totalProjects).toFixed(1)} per project
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-amber-50 to-white p-4 shadow-xs transition-all sm:p-6">
            <div className="absolute top-0 right-0 p-2 text-amber-200 sm:p-4">
              <Eye className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <dt className="text-xs font-medium text-amber-600 sm:text-sm">
              Views
            </dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-4xl">
              {stats.totalViews}
            </dd>
            <div className="mt-1 text-xs text-amber-600/70">
              {(stats.totalViews / stats.totalImages).toFixed(1)} per image
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-green-50 to-white p-4 shadow-xs transition-all sm:p-6">
            <div className="absolute top-0 right-0 p-2 text-green-200 sm:p-4">
              <ThumbsUp className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <dt className="text-xs font-medium text-green-600 sm:text-sm">
              Votes
            </dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-4xl">
              {stats.totalVotes}
            </dd>
            <div className="mt-1 text-xs text-green-600/70">
              {(stats.totalVotes / stats.totalImages).toFixed(1)} per image
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-blue-50 to-white p-4 shadow-xs transition-all sm:p-6">
            <div className="absolute top-0 right-0 p-2 text-blue-200 sm:p-4">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <dt className="text-xs font-medium text-blue-600 sm:text-sm">
              Engagement
            </dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-4xl">
              {(
                (stats.totalVotes + stats.totalViews) /
                stats.totalImages
              ).toFixed(1)}
            </dd>
            <div className="mt-1 text-xs text-blue-600/70">
              actions per image
            </div>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-xs sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search users by name, email, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-lg border-0 bg-gray-50 py-2.5 pr-3 pl-10 text-sm text-gray-900 ring-1 ring-gray-200 ring-inset placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-inset sm:py-3"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-w-[140px] rounded-lg border-0 bg-gray-50 py-2.5 pr-10 pl-4 text-sm font-medium text-gray-700 ring-1 ring-gray-200 ring-inset focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-inset sm:min-w-[180px] sm:py-3"
              >
                <option value="created">Join Date</option>
                <option value="username">Username</option>
                <option value="projects">Projects</option>
                <option value="images">Images</option>
                <option value="views">Views</option>
                <option value="votes">Votes</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="inline-flex min-w-[100px] items-center justify-center gap-1 rounded-lg border-0 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 ring-inset hover:bg-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden focus:ring-inset sm:py-3"
              >
                {sortOrder === "asc" ? (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 4h13M3 8h9M3 12h5M7 20V9m0 11l-4-4m4 4l4-4" />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M3 4h13M3 8h9M3 12h5M7 20V9m0 11l-4-4m4 4l4-4"
                      transform="rotate(180 12 12)"
                    />
                  </svg>
                )}
                <span>
                  {(() => {
                    switch (sortBy) {
                      case "created":
                        return sortOrder === "asc" ? "Oldest" : "Newest";
                      case "username":
                        return sortOrder === "asc" ? "A → Z" : "Z → A";
                      default:
                        return sortOrder === "asc" ? "Lowest" : "Highest";
                    }
                  })()}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* User Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={toggleAllProjects}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FolderKanban className="h-4 w-4" />
              <span>Toggle All Projects</span>
            </button>
          </div>
          {sortedAndFilteredUsers.map((user) => (
            <div
              key={user.id}
              className="group overflow-hidden rounded-xl bg-white p-4 shadow-xs"
            >
              <div className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-3 sm:items-center">
                  {user.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.imageUrl}
                      alt={user.username}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-50"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 ring-2 ring-gray-100">
                      <span className="text-lg font-medium text-gray-600">
                        {user.firstName?.[0] || user.username[0]}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </h2>
                      <div className="flex items-center gap-1">
                        {user.role === "admin" ? (
                          <Crown className="h-4 w-4 text-amber-400" />
                        ) : user.role === "pro" ? (
                          <Sparkles className="h-4 w-4 text-purple-400" />
                        ) : (
                          <Shield className="h-4 w-4 text-gray-400" />
                        )}
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleUpdateRole(
                              user.id,
                              e.target.value as UserRole,
                              user.role,
                              user.username,
                            )
                          }
                          className={`rounded-lg border-0 bg-transparent text-sm font-medium focus:ring-0 ${
                            user.role === "admin"
                              ? "text-amber-600"
                              : user.role === "pro"
                                ? "text-purple-600"
                                : "text-gray-600"
                          } hover:bg-gray-50`}
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                      <span className="truncate">{user.email}</span>
                      <span className="hidden text-gray-300 sm:block">•</span>
                      <span>
                        Joined{" "}
                        {new Date(user.createdAt)
                          .toLocaleString("en-US", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          .replace(/(\d+)\/(\d+)\/(\d+)/, "$3/$1/$2")}
                      </span>
                      <span className="hidden text-gray-300 sm:block">•</span>
                      <span>{user.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    onClick={() =>
                      handleDeleteUser(
                        user.id,
                        user.username,
                        user._count.projects,
                      )
                    }
                    disabled={deletingUser === user.id}
                    className="inline-flex items-center rounded-lg bg-red-50 px-2 py-1.5 text-sm font-medium text-red-600 ring-1 ring-red-200 transition-colors ring-inset hover:bg-red-100 disabled:opacity-50"
                  >
                    {deletingUser === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {user._count.projects > 0 && (
                <div className="mt-3 border-t pt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => toggleUserProjects(user.id)}
                      className="flex items-center gap-2 rounded-md hover:bg-gray-50"
                    >
                      <h3 className="font-medium text-gray-900">Projects</h3>
                      <span className="text-sm text-gray-500">
                        ({user._count.projects})
                      </span>
                      <ChevronDown
                        id={`projects-icon-${user.id}`}
                        className="h-4 w-4 text-gray-400 transition-transform duration-200"
                      />
                    </button>
                  </div>
                  <div
                    id={`projects-${user.id}`}
                    className="mt-2 space-y-2"
                    style={{ display: "none" }}
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {user.projects.map((project) => (
                        <div
                          key={project.id}
                          className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4"
                        >
                          <Link
                            href={`/projects/${project.id}/dashboard`}
                            className="block"
                          >
                            <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                              {project.images &&
                              project.images.length > 0 &&
                              project.images[0].url ? (
                                <Image
                                  src={project.images[0].url}
                                  alt={project.name}
                                  fill
                                  className="object-cover transition-opacity hover:opacity-90"
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </Link>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <Link href={`/projects/${project.id}/dashboard`}>
                                <h3 className="truncate text-base font-medium text-indigo-600 hover:text-indigo-900">
                                  {project.name}
                                </h3>
                              </Link>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                                <div className="flex items-center gap-1.5">
                                  <ImageIcon className="h-4 w-4" />
                                  <span>{project._count.images}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Eye className="h-4 w-4" />
                                  <span>{project.viewCount}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <ThumbsUp className="h-4 w-4" />
                                  <span>
                                    {project.images.reduce(
                                      (sum, image) =>
                                        sum + (image.stats?.total || 0),
                                      0,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleDeleteProject(
                                  project.id,
                                  project.name,
                                  project._count.images,
                                  project.images.reduce(
                                    (sum, image) =>
                                      sum + (image.stats?.total || 0),
                                    0,
                                  ),
                                )
                              }
                              disabled={deletingProject === project.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-red-200 transition-colors ring-inset hover:bg-red-100 disabled:opacity-50"
                            >
                              {deletingProject === project.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
