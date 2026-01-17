"use client";

import { useEffect, useState, useCallback, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { WalkthroughModal } from "@/components/walkthrough-modal";

interface Vote {
  id: string;
  liked: boolean;
  imageId: string;
}

interface ProjectImage {
  id: string;
  url: string;
  projectId: string;
  votes: Vote[];
}

interface VotedState {
  votedImages: Set<string>;
  currentImageIndex: number;
  votingComplete: boolean;
}

export default function ProjectPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<"left" | "right" | null>(
    null,
  );
  const [state, setState] = useState<VotedState>({
    votedImages: new Set(),
    currentImageIndex: 0,
    votingComplete: false,
  });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(
    null,
  );
  const dragThreshold = 100;
  const [isDragging, setIsDragging] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

  const currentImage = images[state.currentImageIndex];
  const nextImage = images[state.currentImageIndex + 1];
  const hasVoted = currentImage
    ? state.votedImages.has(currentImage.id)
    : false;

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Project not found");
          return;
        }
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch project");
      }
      const data = await response.json();

      if (!data || !data.images || data.images.length === 0) {
        setError("No images available");
        return;
      }

      let shuffledImages: ProjectImage[];

      // Check if we have a stored order for this project
      const storedOrder = localStorage.getItem(`imageOrder_${params.id}`);
      if (storedOrder) {
        try {
          // Reconstruct the order using stored IDs
          const orderIds = JSON.parse(storedOrder);
          shuffledImages = orderIds
            .map((id: string) =>
              data.images.find((img: ProjectImage) => img.id === id),
            )
            .filter(Boolean);

          // If some images are missing (e.g., new images added), append them
          const storedIds = new Set(orderIds);
          const newImages = data.images.filter(
            (img: ProjectImage) => !storedIds.has(img.id),
          );
          if (newImages.length > 0) {
            // If we have new images, create a new shuffled order
            shuffledImages = [...data.images];
            for (let i = shuffledImages.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledImages[i], shuffledImages[j]] = [
                shuffledImages[j],
                shuffledImages[i],
              ];
            }
            // Store the new order
            localStorage.setItem(
              `imageOrder_${params.id}`,
              JSON.stringify(shuffledImages.map((img) => img.id)),
            );
          }
        } catch (e) {
          console.error("Error parsing stored order:", e);
          // If there's an error with the stored order, create a new one
          shuffledImages = [...data.images];
          for (let i = shuffledImages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledImages[i], shuffledImages[j]] = [
              shuffledImages[j],
              shuffledImages[i],
            ];
          }
          // Store the new order
          localStorage.setItem(
            `imageOrder_${params.id}`,
            JSON.stringify(shuffledImages.map((img) => img.id)),
          );
        }
      } else {
        // Create new shuffled order
        shuffledImages = [...data.images];
        for (let i = shuffledImages.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledImages[i], shuffledImages[j]] = [
            shuffledImages[j],
            shuffledImages[i],
          ];
        }
        // Store the order
        localStorage.setItem(
          `imageOrder_${params.id}`,
          JSON.stringify(shuffledImages.map((img) => img.id)),
        );
      }

      // Get voted images from localStorage
      const votedImages = new Set<string>(
        JSON.parse(
          localStorage.getItem(`voted_${params.id}`) || "[]",
        ) as string[],
      );

      // Check if all images have been voted on
      const votingComplete = votedImages.size === data.totalImages;

      // Find the first unvoted image
      const firstUnvotedIndex = shuffledImages.findIndex(
        (img) => !votedImages.has(img.id),
      );

      // Set all state at once to prevent flashing
      setState((prev) => ({
        ...prev,
        votedImages,
        currentImageIndex: firstUnvotedIndex === -1 ? 0 : firstUnvotedIndex,
        votingComplete,
      }));
      setImages(shuffledImages);
    } catch (error) {
      console.error("Error fetching images:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to load project");
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  // Find next unvoted image index
  const findNextUnvotedIndex = useCallback(
    (currentIndex: number, votedImages: Set<string>) => {
      return images.findIndex(
        (img, index) => index > currentIndex && !votedImages.has(img.id),
      );
    },
    [images],
  );

  const handleVote = useCallback(
    async (liked: boolean) => {
      if (!currentImage || hasVoted || isVoting || isWalkthroughOpen) return;

      setIsVoting(true);
      setActiveButton(liked ? "right" : "left");

      // Small delay to let the exit animation play
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Optimistically update UI and localStorage
      const newVotedImages = new Set(state.votedImages).add(currentImage.id);
      const votedArray = Array.from(newVotedImages);
      localStorage.setItem(`voted_${params.id}`, JSON.stringify(votedArray));

      // Find the next unvoted image
      const nextUnvotedIndex = findNextUnvotedIndex(
        state.currentImageIndex,
        newVotedImages,
      );

      setState((prev) => ({
        ...prev,
        votedImages: newVotedImages,
        currentImageIndex:
          nextUnvotedIndex === -1 ? prev.currentImageIndex : nextUnvotedIndex,
        votingComplete: newVotedImages.size === images.length,
      }));

      // Send API request in the background
      try {
        const response = await fetch(`/api/projects/${params.id}/vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageId: currentImage.id,
            like: liked,
          }),
        });

        if (!response.ok) {
          const errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const data = await response.json();
            console.error("Vote failed:", data.error || errorMessage);
          } catch {
            console.error("Vote failed:", errorMessage);
          }
        }
      } catch (error) {
        console.error("Error submitting vote:", error);
      } finally {
        setIsVoting(false);
        setActiveButton(null);
      }
    },
    [
      currentImage,
      hasVoted,
      isVoting,
      isWalkthroughOpen,
      params.id,
      state.votedImages,
      images.length,
      state.currentImageIndex,
      findNextUnvotedIndex,
    ],
  );

  useEffect(() => {
    fetchImages();

    // Record page view
    fetch(`/api/projects/${params.id}/view`, {
      method: "POST",
    }).catch((error) => {
      console.error("Error recording page view:", error);
    });
  }, [fetchImages, params.id]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (hasVoted || isWalkthroughOpen) return;

      switch (e.key) {
        case "ArrowLeft":
        case "j":
          handleVote(false);
          break;
        case "ArrowRight":
        case "k":
          handleVote(true);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [hasVoted, handleVote, isWalkthroughOpen]);

  const handleDragStart = (_: never, info: PanInfo) => {
    if (isWalkthroughOpen) return;
    setIsDragging(true);
    setDragStart({ x: info.point.x, y: info.point.y });
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDrag = (_: never, info: PanInfo) => {
    if (!isDragging) return;

    const offset = {
      x: info.point.x - dragStart.x,
      y: info.point.y - dragStart.y,
    };
    setDragOffset(offset);

    if (Math.abs(offset.x) > 20) {
      setDragDirection(offset.x > 0 ? "right" : "left");
    } else {
      setDragDirection(null);
    }
  };

  const handleDragEnd = (_: never, info: PanInfo) => {
    if (!isDragging) return;

    const offset = {
      x: info.point.x - dragStart.x,
      y: info.point.y - dragStart.y,
    };

    if (Math.abs(offset.x) >= dragThreshold) {
      setDragDirection(null);
      handleVote(offset.x > 0);
    }

    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    setDragDirection(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-red-500">
          {error === "Project not found" ? "Project Not Found" : "Error"}
        </h1>
        <p className="text-gray-500">
          {error === "Project not found"
            ? "The project you are looking for does not exist."
            : error}
        </p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2"
        >
          Go Home
        </Link>
      </div>
    );
  }

  if (state.votingComplete) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl font-bold">Thanks for voting!</h1>
        <p className="text-gray-500">
          You&apos;ve voted on all images in this project.
        </p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2"
        >
          Go Home
        </Link>
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-red-500">No Images Available</h1>
        <p className="text-gray-500">This project has no images to vote on.</p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden">
      <WalkthroughModal
        projectId={params.id}
        onOpenChange={setIsWalkthroughOpen}
      />
      <div className="absolute top-6 left-6 z-10">
        <Image
          src="/logo.svg"
          alt="Moodr"
          width={76}
          height={20}
          priority
          className="opacity-20 transition-opacity duration-150 hover:opacity-100"
        />
      </div>

      <div className="absolute top-6 right-6 z-10 rounded-full bg-white px-2 py-0.5 text-xs text-gray-400 shadow-xs">
        {state.votedImages.size} / {images.length}
      </div>

      <div className="flex w-full flex-col items-center">
        <div className="relative aspect-video w-full max-w-[90vw] bg-gray-100 lg:max-w-[80vw]">
          {/* Preload next image */}
          {nextImage && (
            <Image
              src={nextImage.url}
              alt="Preload next image"
              width={0}
              height={0}
              className="invisible absolute"
              priority
            />
          )}
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              id={`image-${currentImage.id}`}
              key={currentImage.id}
              style={{
                x: isDragging ? dragOffset.x : 0,
                rotate: isDragging ? dragOffset.x * 0.03 : 0,
              }}
              initial={{
                x: activeButton === "left" ? 300 : -300,
                opacity: 0,
              }}
              animate={{
                x: 0,
                opacity: 1,
              }}
              exit={{
                x: activeButton === "right" ? 1000 : -1000,
                rotate: activeButton === "right" ? 20 : -20,
                opacity: 0,
                transition: { duration: 0.3, ease: "easeOut" },
              }}
              transition={{ duration: 0.3 }}
              drag={!hasVoted && !isVoting && !isWalkthroughOpen ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              dragMomentum={false}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 cursor-grab will-change-transform active:cursor-grabbing"
            >
              <Image
                src={currentImage.url}
                alt="Project image"
                fill
                className="object-contain"
                loading="eager"
                priority
                draggable={false}
              />
              {/* Vote Overlay */}
              {isDragging && dragDirection && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center rounded-lg border-8"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 0.7,
                    borderColor:
                      dragDirection === "right" ? "#22c55e" : "#ef4444",
                  }}
                  transition={{ duration: 0.1 }}
                >
                  <span
                    className="rounded-full bg-white px-6 py-2 text-2xl font-bold"
                    style={{
                      color: dragDirection === "right" ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {dragDirection === "right" ? "LIKE" : "NOPE"}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-20 flex gap-8">
          <button
            onClick={() => handleVote(false)}
            disabled={hasVoted || isVoting || isWalkthroughOpen}
            className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
              activeButton === "left"
                ? "scale-95 bg-red-500 text-white"
                : "bg-white text-red-500 hover:scale-105 hover:bg-red-50"
            } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100`}
          >
            {isVoting && activeButton === "left" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ThumbsDown className="h-6 w-6" />
            )}
          </button>
          <button
            onClick={() => handleVote(true)}
            disabled={hasVoted || isVoting || isWalkthroughOpen}
            className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
              activeButton === "right"
                ? "scale-95 bg-green-500 text-white"
                : "bg-white text-green-500 hover:scale-105 hover:bg-green-50"
            } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100`}
          >
            {isVoting && activeButton === "right" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ThumbsUp className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
