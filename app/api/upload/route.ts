import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import type { User } from "@prisma/client";

export async function POST(request: Request): Promise<Response> {
  let user: User | null;
  try {
    user = await getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await request.json()) as HandleUploadBody;
    const userId = user.id; // Cache the user ID

    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => {
        // Use the already verified user ID
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
          ],
          maximumSizeInBytes: 4.5 * 1024 * 1024, // 4.5MB
          tokenPayload: JSON.stringify({
            userId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (tokenPayload) {
          const { userId } = JSON.parse(tokenPayload);

          // Add caching headers
          const headers = new Headers();
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
          headers.set(
            "Content-Type",
            blob.contentType || "application/octet-stream",
          );

          console.log("Upload completed:", blob.url);
          console.log("Uploaded by user:", userId);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error handling upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
