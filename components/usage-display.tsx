"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LIMITS } from "@/lib/types";
import { useUsage } from "@/lib/hooks/use-usage";

export function UsageDisplay() {
  const { usage, loading } = useUsage();

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
        <Skeleton className="mb-4 h-6 w-24" />
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const limits = ROLE_LIMITS[usage.role];
  const projectLimit =
    limits.maxProjects === Infinity ? "Unlimited" : limits.maxProjects;
  const imageLimit =
    limits.maxImagesPerProject === Infinity
      ? "Unlimited"
      : limits.maxImagesPerProject;
  const projectPercentage =
    limits.maxProjects === Infinity
      ? 0
      : (usage.projectCount / limits.maxProjects) * 100;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
      <h2 className="mb-4 text-lg font-medium">Account Usage</h2>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Projects</span>
            <span className="text-sm text-gray-600">
              {usage.projectCount} / {projectLimit}
            </span>
          </div>
          {projectPercentage > 0 && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{
                  width: `${Math.min(projectPercentage, 100)}%`,
                }}
              />
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Images per Project</span>
            <span className="text-sm text-gray-600">{imageLimit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
