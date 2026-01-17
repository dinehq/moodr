"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { UserRole, ROLE_LIMITS } from "@/lib/types";

interface UsageStats {
  projectCount: number;
  imagesPerProject: Record<string, number>;
}

export function UserLimits() {
  const { user } = useUser();
  const [role, setRole] = useState<UserRole>("free");
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      const response = await fetch("/api/user/usage");
      const data = await response.json();
      setUsage(data);
      setRole((user?.publicMetadata.role as UserRole) || "free");
    };

    if (user) {
      fetchUsage();
    }
  }, [user]);

  if (!user || !usage) return null;

  const limits = ROLE_LIMITS[role];
  const projectPercentage = (usage.projectCount / limits.maxProjects) * 100;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
      <h2 className="mb-4 text-lg font-medium">Account Usage</h2>

      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>
              Projects ({usage.projectCount}/
              {limits.maxProjects === Infinity ? "∞" : limits.maxProjects})
            </span>
            <span>{Math.min(projectPercentage, 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${Math.min(projectPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
