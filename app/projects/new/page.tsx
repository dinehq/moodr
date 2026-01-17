"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ImageIcon, X, Plus } from "lucide-react";
import { uploadWithProgress } from "@/lib/upload";
import { UsageDisplay } from "@/components/usage-display";
import { ROLE_LIMITS } from "@/lib/types";
import { useUsage } from "@/lib/hooks/use-usage";

export default function NewProject() {
  const [projectName, setProjectName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const { usage, refreshUsage } = useUsage();
  const router = useRouter();

  useEffect(() => {
    // Create object URLs for previews
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    // Cleanup function to revoke URLs
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const validateFiles = useCallback(
    (fileList: FileList | null): File[] => {
      if (!fileList) return [];

      const validFiles: File[] = [];
      const errors: string[] = [];
      const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB in bytes

      // Check if adding these files would exceed the user's limit
      if (usage && usage.role === "free") {
        const totalFiles = files.length + Array.from(fileList).length;
        if (totalFiles > ROLE_LIMITS.free.maxImagesPerProject) {
          setError(
            `Free accounts are limited to ${ROLE_LIMITS.free.maxImagesPerProject} images per project. Please upgrade to Pro for unlimited images.`,
          );
          return [];
        }
      }

      Array.from(fileList).forEach((file) => {
        let isValid = true;

        // Check file size (4.5MB limit for server uploads)
        if (file.size > MAX_SIZE) {
          errors.push(
            `• ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 4.5MB limit`,
          );
          isValid = false;
        }

        // Check file type
        if (!file.type.startsWith("image/")) {
          errors.push(`• ${file.name} is not an image file`);
          isValid = false;
        }

        if (isValid) {
          validFiles.push(file);
        }
      });

      // Show errors if any files are invalid, but still return valid files
      if (errors.length > 0) {
        setError(
          `The following files could not be uploaded:\n${errors.join("\n")}`,
        );
      }

      return validFiles;
    },
    [files, usage, setError],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const validFiles = validateFiles(e.dataTransfer.files);
      if (validFiles.length > 0) {
        setFiles((prevFiles) => [...prevFiles, ...validFiles]);
      }
    },
    [validateFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
    },
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validFiles = validateFiles(e.target.files);
    if (!validFiles.length) {
      if (e.target) e.target.value = ""; // Reset input if no valid files
      return;
    }
    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setPreviews((prevPreviews) => {
      // Revoke the URL being removed
      URL.revokeObjectURL(prevPreviews[index]);
      return prevPreviews.filter((_, i) => i !== index);
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length || !projectName.trim()) return;

    // Check if user has reached their project limit
    if (usage) {
      const limits = ROLE_LIMITS[usage.role];
      if (usage.projectCount >= limits.maxProjects) {
        setError(
          usage.role === "free"
            ? "You've reached the maximum number of projects for a free account. Please contact us to upgrade for unlimited projects."
            : "You've reached your project limit.",
        );
        return;
      }
    }

    setUploading(true);
    setError(null);

    try {
      // First create the project
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: projectName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project");
      }

      const { id: projectId } = await response.json();

      // Upload all images in parallel
      const uploadPromises = files.map(async (file) => {
        try {
          const blob = await uploadWithProgress(file, projectId, {
            onUploadProgress: (progress) => {
              setUploadProgress((prev) => ({
                ...prev,
                [file.name]: progress.percentage,
              }));
            },
          });

          // Create image record in database
          const imageResponse = await fetch(
            `/api/projects/${projectId}/images`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ imageUrl: blob.url }),
            },
          );

          if (!imageResponse.ok) {
            const errorData = await imageResponse.json();
            throw new Error(
              `Failed to save image: ${errorData.error || imageResponse.statusText}`,
            );
          }

          return imageResponse.json();
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw error;
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      await refreshUsage(); // Refresh usage data after successful upload
      router.push(`/projects/${projectId}/dashboard`);
    } catch (error) {
      console.error("Error creating project:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create project. Please try again.",
      );
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  return (
    <div className="container mx-auto min-h-[calc(100vh-65px)] px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.5fr]">
        <div className="relative">
          <h1 className="mb-8 text-2xl font-bold">New Project</h1>

          {usage &&
          usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects ? (
            <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h2 className="mb-4 text-sm font-medium text-amber-900">
                Project Limit Reached
              </h2>
              <p className="mb-4 text-sm text-amber-800">
                {usage.role === "free"
                  ? "You've reached the maximum number of projects for a free account. Please contact us to upgrade for unlimited projects."
                  : "You've reached your project limit."}
              </p>
              {usage.role === "free" && (
                <a
                  href="mailto:moodr@dinehq.com"
                  className="inline-flex items-center rounded-md bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200"
                >
                  Contact Us
                </a>
              )}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Project Name
              </label>
              <input
                type="text"
                id="name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="focus:border-primary focus:ring-primary mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-xs focus:ring-1 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
                placeholder="Enter project name"
                required
                disabled={
                  !!(
                    usage &&
                    usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects
                  )
                }
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium ${usage && usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects ? "text-gray-400" : "text-gray-700"}`}
              >
                Project Images
              </label>

              <label
                htmlFor="file-upload"
                className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                  usage &&
                  usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects
                    ? "cursor-not-allowed border-gray-200 bg-gray-50"
                    : dragActive
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50 border-gray-300"
                }`}
                onDragEnter={
                  usage &&
                  usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects
                    ? undefined
                    : handleDragOver
                }
                onDragOver={
                  usage &&
                  usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects
                    ? undefined
                    : handleDragOver
                }
                onDragLeave={
                  usage &&
                  usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects
                    ? undefined
                    : handleDragLeave
                }
                onDrop={
                  usage &&
                  usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects
                    ? undefined
                    : handleDrop
                }
              >
                <div className="text-center">
                  <ImageIcon
                    className={`mx-auto h-12 w-12 ${usage && usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects ? "text-gray-300" : "text-gray-400"}`}
                  />
                  <div
                    className={`mt-4 flex text-sm ${usage && usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects ? "text-gray-400" : "text-gray-600"}`}
                  >
                    <span
                      className={`font-medium ${usage && usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects ? "text-gray-400" : "text-primary hover:text-primary/90"}`}
                    >
                      Upload images
                    </span>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p
                    className={`text-xs ${usage && usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects ? "text-gray-400" : "text-gray-500"}`}
                  >
                    PNG, JPG, GIF up to 4.5MB
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  multiple
                  accept="image/*"
                  onChange={handleChange}
                  disabled={
                    !!(
                      usage &&
                      usage.projectCount >= ROLE_LIMITS[usage.role].maxProjects
                    )
                  }
                />
              </label>

              {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
                  <div className="text-sm leading-relaxed whitespace-pre-line text-red-700">
                    {error}
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div className="mt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="block text-sm font-medium text-gray-700">
                        Selected Images
                      </h2>
                      {usage?.role === "free" && (
                        <p className="mt-1 text-sm text-gray-500">
                          {files.length} of{" "}
                          {ROLE_LIMITS.free.maxImagesPerProject} images used
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href="/projects"
                        className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (!uploading) {
                            setFiles([]);
                            setPreviews([]);
                          }
                        }}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear All
                      </button>
                      <button
                        type="submit"
                        disabled={
                          uploading || files.length === 0 || !projectName.trim()
                        }
                        className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Create Project with {files.length}{" "}
                            {files.length === 1 ? "Image" : "Images"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="overflow-hidden rounded-lg bg-white"
                      >
                        <div className="relative aspect-4/3 w-full overflow-hidden">
                          {previews[index] ? (
                            <Image
                              src={previews[index]}
                              alt={file.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-100">
                              <ImageIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="truncate pr-2">
                              <div className="truncate text-sm font-medium text-gray-700">
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ({Math.round(file.size / 1024)} KB)
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!uploading) {
                                  removeFile(index);
                                }
                              }}
                              disabled={uploading}
                              className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                            >
                              {uploading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <X className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          {uploading && (
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="bg-primary h-full transition-all duration-300"
                                style={{
                                  width: `${uploadProgress[file.name] || 0}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="h-fit lg:sticky lg:top-8">
          <UsageDisplay />
        </div>
      </div>
    </div>
  );
}
