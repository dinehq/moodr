"use client";

import Link from "next/link";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/nextjs";

const MOCK_CONTENT = [
  {
    type: "logo",
    content: (
      <div className="flex flex-col items-center gap-6">
        <div className="from-primary/80 to-primary flex h-40 w-40 items-center justify-center rounded-2xl bg-linear-to-br">
          <span className="text-4xl font-bold tracking-tighter text-white">
            Moodr
          </span>
        </div>
        <div className="text-center">
          <div className="text-md font-medium text-gray-500">
            Logo Proposals
          </div>
        </div>
      </div>
    ),
  },
  {
    type: "colors",
    content: (
      <div className="flex flex-col items-center gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 w-20 rounded-xl bg-linear-to-br from-rose-400 to-rose-500 shadow-lg shadow-rose-500/20" />
          <div className="h-20 w-20 rounded-xl bg-linear-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/20" />
          <div className="h-20 w-20 rounded-xl bg-linear-to-br from-blue-400 to-blue-500 shadow-lg shadow-blue-500/20" />
          <div className="h-20 w-20 rounded-xl bg-linear-to-br from-violet-400 to-violet-500 shadow-lg shadow-violet-500/20" />
        </div>
        <div className="text-center">
          <div className="text-md font-medium text-gray-500">
            Color Palettes
          </div>
        </div>
      </div>
    ),
  },
  {
    type: "website",
    content: (
      <div className="flex flex-col items-center gap-6">
        <div className="w-56 overflow-hidden rounded-xl bg-linear-to-br from-slate-900 to-slate-800 p-4 shadow-lg shadow-slate-900/20">
          <div className="mb-4 h-4 w-20 rounded-full bg-linear-to-r from-slate-600 to-slate-500" />
          <div className="mb-6 h-32 rounded-lg bg-linear-to-br from-slate-800 to-slate-700 ring-1 ring-white/10" />
          <div className="mb-3 h-2.5 w-full rounded-full bg-linear-to-r from-slate-700 to-slate-600" />
          <div className="mb-3 h-2.5 w-3/4 rounded-full bg-linear-to-r from-slate-700 to-slate-600" />
          <div className="h-2.5 w-1/2 rounded-full bg-linear-to-r from-slate-700 to-slate-600" />
        </div>
        <div className="text-center">
          <div className="text-md font-medium text-gray-500">
            Website Mockups
          </div>
        </div>
      </div>
    ),
  },
  {
    type: "font",
    content: (
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center rounded-xl bg-linear-to-br from-violet-600 to-violet-700 p-8 text-center shadow-lg shadow-violet-500/20">
          <span className="mb-3 bg-linear-to-br from-white to-violet-200 bg-clip-text text-6xl font-bold text-transparent">
            Aa
          </span>
          <span className="text-base text-violet-200">ABCDEFGHIJKLM</span>
        </div>
        <div className="text-center">
          <div className="text-md font-medium text-gray-500">Font Choices</div>
        </div>
      </div>
    ),
  },
];

export default function LandingPage() {
  const { userId } = useAuth();
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleVote = useCallback(
    async (dir: "left" | "right") => {
      if (isAnimating) return;

      setDirection(dir);
      setIsAnimating(true);

      await new Promise((resolve) => setTimeout(resolve, 300));

      setCurrentIndex((prev) => (prev + 1) % MOCK_CONTENT.length);
      setDirection(null);
      setIsAnimating(false);
    },
    [isAnimating],
  );

  // Auto-play functionality
  useEffect(() => {
    const timer = setInterval(() => {
      handleVote(Math.random() > 0.5 ? "right" : "left");
    }, 3000);

    return () => clearInterval(timer);
  }, [handleVote]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handleVote("left");
      } else if (e.key === "ArrowRight") {
        handleVote("right");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isAnimating, handleVote]);

  return (
    <div className="flex min-h-[calc(100vh-65px)] flex-1 flex-col bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-4 pt-10 pb-16 md:pt-16 md:pb-32">
        {/* Hero Section */}
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Left Column - Text Content */}
          <div className="text-left">
            <h1 className="text-primary mb-4 text-5xl font-bold md:text-6xl">
              Moodboard meets Tinder
            </h1>
            <p className="mb-8 max-w-md text-lg text-gray-500">
              Making design decisions is hard. Making design decisions with your
              clients is even harder. Moodr makes browsing the moodboard fun and
              easy.
            </p>
            <div className="flex items-center gap-4">
              {!userId ? (
                <>
                  <Link
                    href="/sign-up"
                    className="hover:bg-primary-dark bg-primary rounded-lg px-8 py-3 text-lg font-medium text-white shadow-lg transition-all hover:shadow-xl"
                  >
                    Sign Up Free
                  </Link>
                  <Link
                    href="/projects/demo"
                    target="_blank"
                    className="rounded-lg bg-white px-8 py-3 text-lg font-medium text-gray-900 shadow-lg ring-1 ring-gray-900/5 transition-all hover:bg-gray-50 hover:shadow-xl"
                  >
                    Try Demo
                  </Link>
                </>
              ) : (
                <Link
                  href="/projects"
                  className="hover:bg-primary-dark bg-primary rounded-lg px-8 py-3 text-lg font-medium text-white shadow-lg transition-all hover:shadow-xl"
                >
                  Go to Projects
                </Link>
              )}
            </div>
          </div>

          {/* Right Column - Interactive Demo */}
          <div className="relative mx-auto w-full max-w-[360px] transition-all duration-500 lg:rotate-3 lg:hover:rotate-0">
            {/* Phone Frame */}
            <div className="overflow-hidden rounded-[2.5rem] shadow-2xl ring-1 shadow-gray-950/10 ring-gray-900/5">
              {/* Phone Screen Content */}
              <div className="aspect-9/16 overflow-hidden bg-white">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentIndex}
                    className="relative flex h-full w-full flex-col items-center justify-center p-8"
                    initial={{
                      opacity: 0,
                      y: 20,
                      scale: 0.8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      x: direction === "left" ? -100 : 100,
                      scale: 0.8,
                      transition: {
                        duration: 0.2,
                        ease: "easeInOut",
                      },
                    }}
                    transition={{
                      duration: 0.2,
                      ease: "easeInOut",
                    }}
                  >
                    {MOCK_CONTENT[currentIndex].content}
                  </motion.div>
                </AnimatePresence>

                {/* Vote Buttons */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 p-8">
                  <button
                    onClick={() => handleVote("left")}
                    disabled={isAnimating}
                    className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-900/5 transition-all hover:shadow-xl ${
                      direction === "left"
                        ? "scale-95 text-red-500 shadow-red-500/10"
                        : "text-red-500 hover:scale-105"
                    } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100`}
                  >
                    <ThumbsDown className="h-7 w-7" />
                  </button>
                  <button
                    onClick={() => handleVote("right")}
                    disabled={isAnimating}
                    className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-900/5 transition-all hover:shadow-xl ${
                      direction === "right"
                        ? "scale-95 text-green-500 shadow-green-500/10"
                        : "text-green-500 hover:scale-105"
                    } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100`}
                  >
                    <ThumbsUp className="h-7 w-7" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="mt-16 md:mt-32">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 md:mb-16">
            How it works
          </h2>
          <div className="relative">
            <div className="relative grid gap-8 md:grid-cols-3">
              <div className="relative flex flex-col">
                <div className="bg-primary mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white">
                  1
                </div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  Create a project
                </h3>
                <p className="text-[15px] leading-relaxed text-gray-500">
                  Upload your designs and share the project link. No sign-up
                  required for voters.
                </p>
              </div>

              <div className="relative flex flex-col">
                <div className="bg-primary mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white">
                  2
                </div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  Collect votes
                </h3>
                <p className="text-[15px] leading-relaxed text-gray-500">
                  Participants vote by swiping or clicking. Simple and fun for
                  everyone.
                </p>
              </div>

              <div className="relative flex flex-col">
                <div className="bg-primary mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white">
                  3
                </div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  Get insights
                </h3>
                <p className="text-[15px] leading-relaxed text-gray-500">
                  View results in real-time and make data-driven decisions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="mx-auto mt-16 md:mt-32">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 md:mb-16">
            Perfect for all kinds of design decisions
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
              <div className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-blue-500">
                <svg width="24" height="24" fill="none">
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-md mb-2 font-semibold text-gray-900">
                Brand Identity
              </h3>
              <p className="text-sm text-gray-500">
                From logos and color schemes to typography and brand guidelines.
                Get quick feedback on brand elements to align with stakeholder
                expectations.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
              <div className="mb-5 inline-flex rounded-xl bg-green-50 p-3 text-green-500">
                <svg width="24" height="24" fill="none">
                  <path
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-md mb-2 font-semibold text-gray-900">
                Visual Content
              </h3>
              <p className="text-sm text-gray-500">
                Social media posts, marketing materials, product photography,
                and illustrations. Quickly gather opinions on visual assets.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
              <div className="mb-5 inline-flex rounded-xl bg-purple-50 p-3 text-purple-500">
                <svg width="24" height="24" fill="none">
                  <path
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-md mb-2 font-semibold text-gray-900">
                UI Design
              </h3>
              <p className="text-sm text-gray-500">
                Website mockups, app interfaces, design systems, and interactive
                prototypes. Validate design decisions with your team or clients.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
              <div className="mb-5 inline-flex rounded-xl bg-orange-50 p-3 text-orange-500">
                <svg width="24" height="24" fill="none">
                  <path
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-md mb-2 font-semibold text-gray-900">
                Layout Options
              </h3>
              <p className="text-sm text-gray-500">
                Page layouts, grid systems, responsive designs, and component
                arrangements. Get feedback on structural decisions.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
              <div className="mb-5 inline-flex rounded-xl bg-pink-50 p-3 text-pink-500">
                <svg width="24" height="24" fill="none">
                  <path
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h10a2 2 0 012 2v12a4 4 0 01-4 4H7m0 0h6M7 21v-4m6 4v-4m-6 0h6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-md mb-2 font-semibold text-gray-900">
                Print Materials
              </h3>
              <p className="text-sm text-gray-500">
                Business cards, brochures, packaging designs, and promotional
                materials. Ensure print designs resonate before production.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
              <div className="mb-5 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-500">
                <svg width="24" height="24" fill="none">
                  <path
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-md mb-2 font-semibold text-gray-900">
                Motion & Animation
              </h3>
              <p className="text-sm text-gray-500">
                Micro-interactions, loading states, transitions, and animated
                content. Get feedback on dynamic design elements.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
              <div className="mb-5 inline-flex rounded-xl bg-rose-50 p-3 text-rose-500">
                <svg width="24" height="24" fill="none">
                  <path
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 2.071-.84 3.946-2.197 5.303m-2.618 2.708L7.601 21.5M12 11V3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-md mb-2 font-semibold text-gray-900">
                Icon Design
              </h3>
              <p className="text-sm text-gray-500">
                App icons, feature icons, and custom icon sets. Ensure your
                iconography resonates with users and maintains visual
                consistency.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
              <div className="mb-5 inline-flex rounded-xl bg-amber-50 p-3 text-amber-500">
                <svg width="24" height="24" fill="none">
                  <path
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zM10 8h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-md mb-2 font-semibold text-gray-900">
                Image Style
              </h3>
              <p className="text-sm text-gray-500">
                Photography style, image treatments, filters, and visual
                effects. Define and validate your image style guide.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-900/5">
              <div className="mb-5 inline-flex rounded-xl bg-cyan-50 p-3 text-cyan-500">
                <svg width="24" height="24" fill="none">
                  <path
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-md mb-2 font-semibold text-gray-900">
                Copy & Messaging
              </h3>
              <p className="text-sm text-gray-500">
                Headlines, taglines, button text, and tone of voice. Test
                different copy variations to find what resonates best.
              </p>
            </div>
          </div>
        </div>

        {/* About Dine Section */}
        <div className="mt-16 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-900/5 md:mt-32">
          <div className="grid gap-6 px-6 py-8 md:grid-cols-2 md:gap-12 md:p-12 md:py-12">
            <div className="flex flex-col justify-start">
              <div className="mb-4">
                <Link
                  href="https://www.dinehq.com"
                  target="_blank"
                  className="transition-opacity hover:opacity-80"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="94"
                    height="32"
                    viewBox="0 0 94 32"
                  >
                    <path
                      fill="currentColor"
                      d="M0 30.5h13.48c8.6 0 15.64-4.96 15.64-14-0.04-9.04-7-14-15.64-14H0v28zm11.8-5.08V7.54h.48c3.44 0 5.16 2.16 5.16 8.96s-1.72 8.92-5.16 8.92zm19-14.92V30.5H42V10.42c-2 1.52-4 1.96-5.6 1.96-1.88 0-3.6-.44-5.6-1.96zm-.2-4.76c0 2.92 2.56 5.04 5.8 5.04s5.8-2.12 5.8-5.04S39.64.5 36.4.5s-5.8 2.12-5.8 5.16zm13.81 24.84h11.2V15.82c.32-.44.8-.68 1.44-.68.8 0 1.36.52 1.36 1.64v13.72h11.2V16.06c0-4.52-2.8-7.16-7.32-7.16-3.24 0-5.6 1.32-6.68 3.72V9.7h-11.2v20.8zm38.48.8c6.76 0 9.88-3.84 10.28-9.08-.92.8-2.72 1.44-5 1.44-4.04 0-6.72-1.8-7.04-4.92h12.32c0-5.72-4.24-9.84-10.64-9.84-6.64 0-11.6 4.84-11.6 11.52 0 6.2 4.24 10.88 11.88 10.88zm-1.96-14.72v-.24c0-3.2.68-4.68 1.88-4.68 1.28 0 1.92 1.48 1.92 4.68v.24h-3.8z"
                    />
                  </svg>
                </Link>
              </div>
              <p className="text-[15px] leading-relaxed text-gray-500">
                Dine is a creative design studio based in Beijing with more than
                ten years of experience. We design brand identities and digital
                experiences that connect and inspire.
              </p>
            </div>

            <div className="flex flex-col justify-between">
              <h3 className="mb-2 text-xl font-semibold">
                <Link
                  href="https://www.dinehq.com/news/moodr/"
                  target="_blank"
                  className="hover:text-primary transition-colors"
                >
                  Moodr is an experiment by Dine
                </Link>
              </h3>
              <p className="text-[15px] leading-relaxed text-gray-500">
                Started as an internal joke, Moodr became a real thing. We
                imagined a tool where clients could browse moodboards and give
                feedback, just like they do on dating apps.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl p-6">
          <div className="flex h-full flex-col items-center justify-between gap-4 md:flex-row">
            <span className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Moodr
            </span>
            <div className="flex items-center gap-4">
              <Link
                href="https://x.com/dinehq"
                target="_blank"
                className="hover:text-primary text-sm text-gray-600 transition-colors"
              >
                X (Twitter)
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
