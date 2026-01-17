"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface WalkthroughModalProps {
  projectId: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function WalkthroughModal({
  projectId,
  onOpenChange,
}: WalkthroughModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already voted on this project
    const hasVoted = localStorage.getItem(`voted_${projectId}`);
    if (!hasVoted) {
      setIsOpen(true);
      onOpenChange?.(true);
    }
  }, [projectId, onOpenChange]);

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative mx-4 max-w-md overflow-hidden rounded-2xl bg-white/95 shadow-2xl ring-1 ring-gray-900/5"
      >
        <div className="absolute inset-0 bg-linear-to-b from-white/50" />

        <div className="relative p-8 text-center">
          <h2 className="mb-3 bg-linear-to-br from-gray-900 to-gray-600 bg-clip-text text-2xl font-semibold text-transparent">
            Welcome to Moodr!
          </h2>
          <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
            Help make design decisions by voting on different options. Simply
            swipe right if you like it, left if you don&apos;t. You can also use
            the arrow keys.
          </p>

          <div className="mb-10 flex items-center justify-center gap-10">
            <div className="group flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-500 shadow-xs ring-1 ring-red-100 transition-transform group-hover:-translate-x-0.5">
                <ThumbsDown className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-600">Dislike</span>
            </div>
            <div className="group flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-50 text-green-500 shadow-xs ring-1 ring-green-200 transition-transform group-hover:translate-x-0.5">
                <ThumbsUp className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-600">Like</span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 w-full rounded-lg bg-linear-to-r px-4 py-2.5 font-medium shadow-xs transition-all active:scale-[0.99]"
          >
            Got it!
          </button>
        </div>
      </motion.div>
    </div>
  );
}
