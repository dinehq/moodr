"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import {
  ImageIcon,
  ThumbsUp,
  MoreHorizontal,
  Link2,
  Trash2,
  Loader2,
} from "lucide-react";

interface ProjectImage {
  id: string;
  url: string;
}

interface Project {
  id: string;
  name: string;
  images: ProjectImage[];
  totalVotes?: number;
  totalImages: number;
}

export function ProjectCard({ project }: { project: Project }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasMultipleImages = project.images.length >= 4;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/projects/${project.id}`,
      );
      setIsDropdownOpen(false);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete project");

      // Refresh the page to show updated list
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-xs transition-shadow hover:shadow-md">
      <div className="relative aspect-video w-full">
        <Link href={`/projects/${project.id}/dashboard`}>
          {hasMultipleImages ? (
            <div className="relative grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-white transition-opacity duration-150 hover:opacity-80">
              {project.images.slice(0, 4).map((image, index) => (
                <div key={image.id} className="relative">
                  <Image
                    src={image.url}
                    alt={`Image ${index + 1} of ${project.name}`}
                    className="object-cover"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative h-full w-full transition-opacity duration-300 hover:opacity-80">
              {project.images[0] ? (
                <Image
                  src={project.images[0].url}
                  alt={`Cover for ${project.name}`}
                  className="object-cover"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100">
                  <span className="text-gray-400">No image available</span>
                </div>
              )}
            </div>
          )}
        </Link>
      </div>

      <div className="p-4">
        <Link href={`/projects/${project.id}/dashboard`}>
          <h2 className="text-xl font-bold hover:text-gray-600">
            {project.name}
          </h2>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" />
              <span>{project.totalImages} images</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-4 w-4" />
              <span>{project.totalVotes || 0} votes</span>
            </div>
          </div>

          {/* Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-all group-hover:bg-gray-100 hover:bg-gray-200"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 bottom-full z-10 mb-2 w-48 overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
                <button
                  onClick={handleCopyLink}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Link2 className="h-4 w-4" />
                  Copy Link
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {isDeleting ? "Deleting..." : "Delete Project"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
