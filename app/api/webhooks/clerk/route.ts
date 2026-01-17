import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Handle the webhook
  try {
    if (evt.type === "user.created") {
      const { id, username } = evt.data;

      // Create user in our database
      await prisma.user.create({
        data: {
          id,
          username: username || `${id}`,
        },
      });

      // Set initial role to free
      const clerkApiKey = process.env.CLERK_SECRET_KEY;
      if (!clerkApiKey) {
        throw new Error("Missing CLERK_SECRET_KEY");
      }

      await fetch(`https://api.clerk.com/v1/users/${id}/metadata`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          privateMetadata: {
            role: "free",
          },
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return NextResponse.json(
      { error: "Error handling webhook" },
      { status: 500 },
    );
  }
}
