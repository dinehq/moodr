import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import type { UserRole } from "@/lib/types";

interface Usage {
  projectCount: number;
  imagesPerProject?: { [key: string]: number };
  role: UserRole;
}

interface UsageHookReturn {
  usage: Usage | null;
  loading: boolean;
  error: string | null;
  refreshUsage: () => Promise<void>;
}

const CACHE_TIME = 30000; // 30 seconds
let cachedUsage: Usage | null = null;
let lastFetchTime = 0;

export function useUsage(): UsageHookReturn {
  const { user } = useUser();
  const [usage, setUsage] = useState<Usage | null>(cachedUsage);
  const [loading, setLoading] = useState(!cachedUsage);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      const now = Date.now();
      // Return cached data if it's fresh
      if (cachedUsage && now - lastFetchTime < CACHE_TIME) {
        setUsage(cachedUsage);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/user/usage");
      if (!response.ok) {
        throw new Error("Failed to fetch usage data");
      }
      const data = await response.json();

      // Update cache
      cachedUsage = data;
      lastFetchTime = now;

      setUsage(data);
      setError(null);
    } catch (error) {
      console.error("Error fetching usage:", error);
      setError("Failed to load usage data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsage();
    }
  }, [user]);

  const refreshUsage = async () => {
    setLoading(true);
    await fetchUsage();
  };

  return {
    usage,
    loading,
    error,
    refreshUsage,
  };
}
