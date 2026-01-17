import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  // Public paths that don't require authentication
  const isPublicPath =
    req.nextUrl.pathname === "/" || // Landing page
    req.nextUrl.pathname.startsWith("/projects/") || // Project pages
    req.nextUrl.pathname.startsWith("/api/projects/") || // Project APIs
    req.nextUrl.pathname.startsWith("/sign-in") || // Sign in pages
    req.nextUrl.pathname.startsWith("/sign-up") || // Sign up pages
    req.nextUrl.pathname.startsWith("/api/webhooks/"); // Webhooks

  // Allow public access to these paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", "/projects");
    return NextResponse.redirect(signInUrl);
  }

  // If user is signed in and tries to access sign-in/sign-up pages, redirect to projects
  if (
    userId &&
    (req.nextUrl.pathname.startsWith("/sign-in") ||
      req.nextUrl.pathname.startsWith("/sign-up"))
  ) {
    return NextResponse.redirect(new URL("/projects", req.url));
  }

  return NextResponse.next();
});

// Stop Middleware running on static files
export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
