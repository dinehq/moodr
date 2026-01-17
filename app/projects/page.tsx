"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ImageIcon, Users, ThumbsUp } from "lucide-react";
import { ProjectCard } from "@/components/project-card";

type Image = {
  id: string;
  url: string;
  stats?: {
    likes: number;
    dislikes: number;
    total: number;
  };
};

type Project = {
  id: string;
  name: string;
  createdAt: string;
  images: Image[];
  totalVotes?: number;
  totalImages: number;
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex w-full flex-col gap-8 md:flex-row">
        <div className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-gray-100 bg-white p-6 shadow-xs">
          <div className="rounded-full bg-gray-50 p-3">
            <ImageIcon className="h-6 w-6 text-gray-600" />
          </div>
          <h3 className="text-md font-medium">Create a project</h3>
          <p className="text-center text-sm text-gray-500">
            Upload your designs and share the project link.
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-gray-100 bg-white p-6 shadow-xs">
          <div className="rounded-full bg-gray-50 p-3">
            <Users className="h-6 w-6 text-gray-600" />
          </div>
          <h3 className="text-md font-medium">Collect votes</h3>
          <p className="text-center text-sm text-gray-500">
            Participants vote by swiping or clicking.
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-gray-100 bg-white p-6 shadow-xs">
          <div className="rounded-full bg-gray-50 p-3">
            <ThumbsUp className="h-6 w-6 text-gray-600" />
          </div>
          <h3 className="text-md font-medium">Get insights</h3>
          <p className="text-center text-sm text-gray-500">
            View results and make data-driven decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-xs">
      <div className="relative aspect-video w-full">
        <div className="relative grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-white">
          <div className="h-full animate-pulse bg-gray-200" />
          <div className="h-full animate-pulse bg-gray-200" />
          <div className="h-full animate-pulse bg-gray-200" />
          <div className="h-full animate-pulse bg-gray-200" />
        </div>
      </div>
      <div className="p-4">
        <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-14 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-14 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-7 w-7 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function ProjectsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingUser, setViewingUser] = useState<string | null>(null);

  const fetchProjects = useCallback(
    async (username: string | null) => {
      try {
        const url = username
          ? `/api/projects?user=${username}`
          : "/api/projects";
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch projects");
        }

        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch projects",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const userParam = searchParams.get("user");
    setViewingUser(userParam);
    setIsLoading(true);
    fetchProjects(userParam);
  }, [searchParams, fetchProjects]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {viewingUser ? `${viewingUser}'s Projects` : "Projects"}
          </h1>
          {viewingUser && (
            <Link
              href="/admin"
              className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Admin Dashboard
            </Link>
          )}
        </div>
        {!viewingUser && (
          <Link
            href="/projects/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
          >
            New Project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        viewingUser ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8">
            <p className="text-center text-gray-500">
              {viewingUser} hasn&apos;t created any projects yet
            </p>
          </div>
        ) : (
          <EmptyState />
        )
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsPageContent />
    </Suspense>
  );
}
