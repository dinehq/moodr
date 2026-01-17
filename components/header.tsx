"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { UserButton, SignInButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { LayoutDashboard, ChevronDown, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("free");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isVotingPage =
    /^\/projects\/[^/\s]+$/.test(pathname) && pathname !== "/projects/new";
  const isLandingPage = pathname === "/";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch user role when user is loaded
  useEffect(() => {
    async function fetchUserRole() {
      if (!user) return;
      try {
        const response = await fetch("/api/user/usage");
        if (!response.ok) throw new Error("Failed to fetch user role");
        const data = await response.json();
        setUserRole(data.role);
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    }

    fetchUserRole();
  }, [user]);

  // Only hide header on voting page
  if (isVotingPage) return null;

  const isAdmin = userRole === "admin";

  return (
    <header className="border-b border-gray-200 bg-white">
      <div
        className={cn(
          "mx-auto flex h-16 w-full items-center justify-between px-4",
          isLandingPage ? "max-w-5xl" : "container",
        )}
      >
        <Link
          href={isSignedIn ? "/projects" : "/"}
          className="text-xl font-bold text-gray-900 hover:text-gray-700"
        >
          <Image
            src="/logo.svg"
            alt="Moodr"
            width={92}
            height={24}
            className="hover:opacity-80"
            priority
          />
        </Link>

        <div className="flex items-center">
          {isSignedIn ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 md:px-4"
                >
                  <span>Admin</span>
                </Link>
              )}
              <div className="relative mr-2 md:mr-4" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 md:px-4"
                >
                  <span>Projects</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    <Link
                      href="/projects"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      My Projects
                    </Link>
                    <Link
                      href="/projects/new"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Plus className="h-4 w-4" />
                      New Project
                    </Link>
                  </div>
                )}
              </div>

              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8",
                  },
                }}
              />
            </>
          ) : (
            <SignInButton mode="modal" forceRedirectUrl="/projects">
              <button className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}
