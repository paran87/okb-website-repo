import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import {
  addComment,
  deleteComment,
  editComment,
  getEngagement,
  getSummary,
  isVisitorId,
  REACTIONS,
  setReaction,
  type Reaction,
} from "@/features/gallery/server/engagement";

export const dynamic = "force-dynamic";

/** Reactions and comments of one Gallery item (?key=…&visitor=<random id>). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const visitor = request.nextUrl.searchParams.get("visitor");
  return ok(await getEngagement(key, isVisitorId(visitor) ? visitor : null));
});

/**
 * { action: "react", key, visitor, reaction | null }, { action: "comment", key, visitor, body },
 * { action: "edit-comment", key, visitor, id, body } or { action: "delete-comment", key, visitor, id }
 * (edit and delete only match comments written with the same visitor id).
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.action === "summary" && Array.isArray(body.keys)) return ok(await getSummary(body.keys as string[]));
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
  if (body.action === "edit-comment") {
    return ok({ comment: await editComment(body.key, body.visitor, body.id, body.body) });
  }
  if (body.action === "delete-comment") {
    await deleteComment(body.key, body.visitor, body.id);
    return ok({ deleted: true });
  }
  throw new ApiError(400, "VALIDATION_ERROR", "Unknown action.");
});
