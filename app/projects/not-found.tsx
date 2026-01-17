import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Project Not Found</h1>
      <p className="text-gray-500">
        The project you are looking for does not exist.
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
