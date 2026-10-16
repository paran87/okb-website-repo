import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { addComment, getEngagement, isVisitorId, REACTIONS, setReaction, type Reaction } from "@/features/gallery/server/engagement";

export const dynamic = "force-dynamic";

/** Reactions and comments of one Gallery item (?key=…&visitor=<random id>). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const visitor = request.nextUrl.searchParams.get("visitor");
  return ok(await getEngagement(key, isVisitorId(visitor) ? visitor : null));
});

/** { action: "react", key, visitor, reaction | null } or { action: "comment", key, visitor, body } */
export const POST = withApiHandler(async (request: NextRequest) => {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.key !== "string" || !isVisitorId(body.visitor)) throw new ApiError(400, "VALIDATION_ERROR", "Invalid request.");
  if (body.action === "react") {
    const reaction = body.reaction === null ? null : (REACTIONS as readonly unknown[]).includes(body.reaction) ? (body.reaction as Reaction) : undefined;
    if (reaction === undefined) throw new ApiError(400, "VALIDATION_ERROR", "Unknown reaction.");
    await setReaction(body.key, body.visitor, reaction);
    return ok(await getEngagement(body.key, body.visitor));
  }
  if (body.action === "comment") {
    const comment = await addComment(body.key, body.visitor, body.body);
    return ok({ comment }, { status: 201 });
  }
  throw new ApiError(400, "VALIDATION_ERROR", "Unknown action.");
});
