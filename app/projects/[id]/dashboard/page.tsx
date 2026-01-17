"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
  Link2,
  MoreHorizontal,
  ImageIcon,
  RotateCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadWithProgress } from "@/lib/upload";
import { UserRole, ROLE_LIMITS } from "@/lib/types";
import { useUser } from "@clerk/nextjs";

interface Vote {
  liked: boolean;
}

interface ProjectImage {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  votes: Vote[];
  stats: {
    total: number;
    likes: number;
    dislikes: number;
  };
}

interface Project {
  id: string;
  name: string;
  createdAt?: string;
  viewCount?: number;
  totalImages: number;
  images: ProjectImage[];
}

type SortOption = "likes" | "dislikes" | "total";
type SortDirection = "asc" | "desc";

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-14" />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-[112px] rounded-lg" />
        <Skeleton className="h-[112px] rounded-lg" />
        <Skeleton className="h-[112px] rounded-lg" />
      </div>

      <div className="mb-8 flex items-center gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg bg-white shadow-xs"
          >
            <Skeleton className="aspect-video w-full" />
            <div className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-5 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const { user } = useUser();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [resettingVotes, setResettingVotes] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("likes");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [uploading, setUploading] = useState(false);
  const addImagesRef = useRef<HTMLInputElement>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [introHidden, setIntroHidden] = useState(false);
  const [previewImage, setPreviewImage] = useState<ProjectImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [replacingImage, setReplacingImage] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [usage, setUsage] = useState<{
    projectCount: number;
    role: UserRole;
    imagesPerProject?: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch("/api/user/usage");
        if (!response.ok) {
          throw new Error("Failed to fetch usage data");
        }
        const data = await response.json();
        setUsage(data);
      } catch (error) {
        console.error("Error fetching usage:", error);
        setError("Failed to load usage data");
      }
    }

    if (user) {
      fetchUsage();
    }
  }, [user]);

  useEffect(() => {
    // Create object URLs for previews
    const urls = uploadFiles.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    // Cleanup function to revoke URLs
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploadFiles]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if the click was outside any dropdown menu or button
      if (
        !target.closest(".dropdown-menu") &&
        !target.closest(".dropdown-button")
      ) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewImage(null);
        setOpenDropdownId(null);
      }
    };

    if (previewImage || openDropdownId) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [previewImage, openDropdownId]);

  const validateFiles = (fileList: FileList | null): File[] => {
    if (!fileList) return [];

    const validFiles: File[] = [];
    const errors: string[] = [];
    const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB in bytes

    // Check if adding these files would exceed the user's limit
    if (usage && usage.role === "free") {
      const currentImageCount = usage.imagesPerProject?.[params.id] || 0;
      const totalFiles = currentImageCount + Array.from(fileList).length;
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

    // Show errors if any files are invalid
    if (errors.length > 0) {
      setError(
        `The following files could not be uploaded:\n${errors.join("\n")}`,
      );
    }

    return validFiles;
  };

  const validateSingleFile = (file: File): boolean => {
    const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB in bytes

    if (file.size > MAX_SIZE) {
      setError(`${file.name} exceeds 4.5MB limit`);
      return false;
    }

    if (!file.type.startsWith("image/")) {
      setError(`${file.name} is not an image file`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const validFiles = validateFiles(files);
    if (!validFiles.length) {
      if (e.target) e.target.value = ""; // Reset input if no valid files
      return;
    }

    setUploadFiles(validFiles);
    if (e.target) e.target.value = ""; // Reset input
  };

  const handleAddImages = async () => {
    if (!uploadFiles.length) return;

    setUploading(true);

    try {
      // Upload all files in parallel
      const uploadPromises = uploadFiles.map(async (file) => {
        try {
          console.log(`Starting upload for ${file.name}`);
          const blob = await uploadWithProgress(file, params.id, {
            onUploadProgress: (progress) => {
              setUploadProgress((prev) => ({
                ...prev,
                [file.name]: progress.percentage,
              }));
            },
          });
          console.log(`Upload successful for ${file.name}, got URL:`, blob.url);

          // Create image record in database
          console.log(`Creating database record for ${file.name}`);
          const response = await fetch(`/api/projects/${params.id}/images`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageUrl: blob.url }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(
              `Failed to create database record for ${file.name}:`,
              errorData,
            );
            throw new Error(
              `Failed to save image: ${errorData.error || response.statusText}`,
            );
          }

          const result = await response.json();
          console.log(
            `Database record created successfully for ${file.name}:`,
            result,
          );
          return result;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw error;
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Refresh project data and reset state
      console.log("All files processed, refreshing project data");
      await fetchProject();
      setError(null); // Clear any previous errors after successful upload
    } catch (error) {
      console.error("Error uploading images:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to upload images. Please try again.",
      );
    } finally {
      setUploading(false);
      // Only clear files and previews after all uploads are done
      setUploadFiles([]);
      setPreviews([]);
      // Keep upload progress visible for a moment before clearing
      setTimeout(() => {
        setUploadProgress({});
      }, 500);
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setPreviews((prevPreviews) => {
      URL.revokeObjectURL(prevPreviews[index]);
      return prevPreviews.filter((_, i) => i !== index);
    });
  };

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      const data = await response.json();

      if (!data || !data.images) {
        throw new Error("Invalid project data");
      }

      // The API now provides the stats directly, no need to recalculate
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProject();
  }, [params.id, fetchProject]);

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    setDeletingImage(imageId);
    try {
      const response = await fetch(`/api/projects/${params.id}/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId, imageUrl }),
      });

      if (!response.ok) throw new Error("Failed to delete image");

      // Refresh project data
      await fetchProject();
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image. Please try again.");
    } finally {
      setDeletingImage(null);
    }
  };

  const handleDeleteProject = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    )
      return;

    setDeletingProject(true);
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete project");

      router.push("/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project. Please try again.");
      setDeletingProject(false);
    }
  };

  const handleReplaceImage = async (imageId: string, file: File) => {
    // Validate file size and type
    if (!validateSingleFile(file)) return;

    try {
      setUploading(true);
      setReplacingImage(imageId);
      // Upload the file and track progress
      const blob = await uploadWithProgress(file, params.id, {
        onUploadProgress: (progress) => {
          setUploadProgress((prev) => ({
            ...prev,
            [imageId]: progress.percentage,
          }));
        },
      });

      // Update the image record in the database
      const response = await fetch(
        `/api/projects/${params.id}/images/${imageId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl: blob.url }),
        },
      );

      if (!response.ok) {
        let errorMessage = `Failed to update image: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use the status text
          if (response.status === 404) {
            errorMessage = "Image not found";
          } else if (response.status === 413) {
            errorMessage = "Image file is too large";
          } else if (response.status >= 500) {
            errorMessage = "Server error occurred while updating image";
          }
        }
        throw new Error(errorMessage);
      }

      // Refresh project data
      await fetchProject();
      setError(null);
    } catch (error) {
      console.error("Error replacing image:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to replace image. Please try again.",
      );
    } finally {
      setUploading(false);
      setReplacingImage(null);
      setUploadProgress({});
    }
  };

  const sortImages = (images: ProjectImage[]) => {
    return [...images].sort((a, b) => {
      if (!a.stats || !b.stats) return 0;

      const multiplier = sortDirection === "desc" ? -1 : 1;

      switch (sortBy) {
        case "likes":
          return (a.stats.likes - b.stats.likes) * multiplier;
        case "dislikes":
          return (a.stats.dislikes - b.stats.dislikes) * multiplier;
        case "total":
        default:
          return (a.stats.total - b.stats.total) * multiplier;
      }
    });
  };

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(option);
      setSortDirection("desc");
    }
  };

  const SortButton = ({
    option,
    label,
  }: {
    option: SortOption;
    label: string;
  }) => {
    const isActive = sortBy === option;
    return (
      <button
        onClick={() => handleSort(option)}
        className={`inline-flex h-9 items-center gap-1 rounded-md px-4 text-sm font-medium ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        {label}
        {isActive &&
          (sortDirection === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          ))}
      </button>
    );
  };

  const handleEditName = () => {
    setEditedName(project?.name || "");
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === project?.name) {
      handleCancelEdit();
      return;
    }

    setSavingName(true);
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editedName.trim() }),
      });

      if (!response.ok) throw new Error("Failed to update project name");

      // Update local state
      setProject((prev) =>
        prev ? { ...prev, name: editedName.trim() } : null,
      );
      handleCancelEdit();
    } catch (error) {
      console.error("Error updating project name:", error);
      alert("Failed to update project name. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      // Try the modern clipboard API first
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        // Fallback for mobile Safari
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        return true;
      } catch (error) {
        console.error("Failed to copy text:", error);
        return false;
      }
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/projects/${params.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetVotes = async () => {
    if (
      !confirm(
        "Are you sure you want to reset all votes for this project? This action cannot be undone.",
      )
    )
      return;

    setResettingVotes(true);
    try {
      const response = await fetch(`/api/projects/${params.id}/reset`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to reset votes");

      // Refresh project data
      await fetchProject();
    } catch (error) {
      console.error("Error resetting votes:", error);
      alert("Failed to reset votes. Please try again.");
    } finally {
      setResettingVotes(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Error</h1>
          <p>Failed to load project</p>
        </div>
      </div>
    );
  }

  // Intro section to encourage sharing
  const IntroSection = () => {
    // Only show intro if project has no votes and it's not manually hidden
    const totalVotes = project.images.reduce(
      (sum, img) => sum + (img.stats?.total || 0),
      0,
    );
    if (totalVotes > 0 || introHidden) return null;

    return (
      <div className="relative mb-6 overflow-hidden rounded-lg border border-blue-200 bg-blue-50 p-6">
        <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row">
          <div className="flex-1">
            <h2 className="text-md mb-2 font-medium text-blue-600">
              🎉 Ready to get feedback? Some quick tips:
            </h2>
            <ol className="list-inside list-decimal space-y-1 text-sm text-blue-500">
              <li>
                Use the <span className="font-medium">Copy Link</span> button
                below to share your project with others
              </li>
              <li>
                You can add more images to your project using the dropdown menu
              </li>
              <li>
                Your viewers don’t need an account to vote, and they can only
                vote once per session
              </li>
            </ol>
          </div>
          <button
            onClick={() => setIntroHidden(true)}
            className="inline-flex h-9 items-center rounded-md bg-blue-100 px-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-200"
            title="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  const sortedImages = sortImages(project.images);

  return (
    <div className="container mx-auto px-4 py-8">
      <IntroSection />
      <input
        type="file"
        ref={addImagesRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm whitespace-pre-line text-red-700">
            {error}
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          {isEditingName ? (
            <div className="group -mx-2 -my-1 flex items-center gap-4 rounded-lg bg-gray-200 px-2 py-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="max-w-96 min-w-0 bg-transparent text-4xl font-bold focus:outline-hidden"
                  placeholder="Project name"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                  >
                    {savingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={savingName}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="group -mx-2 -my-1 flex items-center gap-4 rounded-lg px-2 py-1 hover:bg-gray-200">
              <button
                onClick={handleEditName}
                className="flex items-center gap-2"
              >
                <h1 className="text-4xl font-bold">{project?.name}</h1>
                <span className="rounded-lg p-2 text-gray-400 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <Pencil className="h-4 w-4" />
                </span>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleCopyLink}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-200 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
          >
            <Link2 className="h-4 w-4" />
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gray-200 text-gray-700 transition-colors hover:bg-gray-300"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 z-10 mt-2 w-56 divide-y divide-gray-100 rounded-md bg-white shadow-lg">
                <div className="py-1">
                  <button
                    onClick={() => {
                      addImagesRef.current?.click();
                      setIsDropdownOpen(false);
                    }}
                    disabled={uploading}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add Images
                  </button>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleResetVotes();
                      setIsDropdownOpen(false);
                    }}
                    disabled={resettingVotes}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {resettingVotes ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    )}
                    Reset Votes
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    disabled={deletingProject}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {deletingProject ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {deletingProject ? "Deleting..." : "Delete Project"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-xs">
          <div className="text-sm font-medium text-gray-500">Total Images</div>
          <div className="mt-2 text-3xl font-bold">
            {project?.totalImages || 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-xs">
          <div className="text-sm font-medium text-gray-500">Total Votes</div>
          <div className="mt-2 text-3xl font-bold">
            {project?.images.reduce(
              (sum, img) => sum + (img.stats?.total || 0),
              0,
            ) || 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-xs">
          <div className="text-sm font-medium text-gray-500">Total Views</div>
          <div className="mt-2 text-3xl font-bold">
            {project?.viewCount || 0}
          </div>
        </div>
      </div>

      <div className="mb-8 flex items-center gap-2">
        <SortButton option="likes" label="Likes" />
        <SortButton option="dislikes" label="Dislikes" />
        <SortButton option="total" label="Total Votes" />
      </div>

      {/* Upload previews */}
      {uploadFiles.length > 0 && (
        <div className="-mx-4 mb-8 rounded-lg bg-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Selected Images</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!uploading) {
                    setUploadFiles([]);
                    setPreviews([]);
                  }
                }}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!uploading) {
                    handleAddImages();
                  }
                }}
                disabled={uploading || !uploadFiles.length}
                className="bg-primary hover:bg-primary/90 disabled:hover:bg-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Upload {uploadFiles.length}{" "}
                    {uploadFiles.length === 1 ? "Image" : "Images"}
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {uploadFiles.map((file, index) => (
              <div key={index} className="overflow-hidden rounded-lg bg-white">
                <div className="relative aspect-video w-full overflow-hidden">
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
                          removeUploadFile(index);
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedImages.map((image) => (
          <div
            key={image.id}
            className="group overflow-hidden rounded-lg bg-white shadow-xs"
          >
            <div className="relative aspect-video">
              <Image
                src={image.url}
                alt="Project image"
                fill
                className="cursor-pointer object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                onClick={() => setPreviewImage(image)}
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    👍 {image.stats?.likes}
                  </span>
                  <span className="text-sm text-gray-500">
                    👎 {image.stats?.dislikes}
                  </span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => {
                      const currentDropdown = openDropdownId;
                      setOpenDropdownId(
                        currentDropdown === image.id ? null : image.id,
                      );
                    }}
                    className="dropdown-button flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {openDropdownId === image.id && (
                    <div className="dropdown-menu absolute right-0 bottom-full z-10 mb-1 w-48 overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
                      <button
                        onClick={() => {
                          fileInputRefs.current[image.id]?.click();
                        }}
                        disabled={replacingImage === image.id}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {replacingImage === image.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCw className="h-4 w-4" />
                        )}
                        {replacingImage === image.id
                          ? "Replacing..."
                          : "Replace"}
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteImage(image.id, image.url);
                        }}
                        disabled={deletingImage === image.id}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {deletingImage === image.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {deletingImage === image.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {uploading && uploadProgress[image.id] !== undefined && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{
                      width: `${uploadProgress[image.id] || 0}%`,
                    }}
                  />
                </div>
              )}
            </div>
            <input
              type="file"
              ref={(el) => {
                if (el) {
                  fileInputRefs.current[image.id] = el;
                }
              }}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleReplaceImage(image.id, file);
                }
                e.target.value = ""; // Reset input
              }}
            />
          </div>
        ))}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-10 right-10 z-10 rounded-full bg-white p-2 text-gray-600 shadow-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="pointer-events-none relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[85vh] w-[85vw]">
              <Image
                src={previewImage.url}
                alt="Preview"
                className="rounded-lg object-contain"
                fill
                sizes="85vw"
                priority
              />
            </div>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="rounded-full bg-white px-4 py-2 text-sm">
                👍 {previewImage.stats?.likes || 0}
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-sm">
                👎 {previewImage.stats?.dislikes || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
