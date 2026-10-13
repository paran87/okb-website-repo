import type { NextRequest } from "next/server";
import { z } from "zod";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { MEDIA_COLLECTIONS, mediaCollection } from "@/features/admin/collections";
import { deleteMedia, listMedia, updateMedia } from "@/features/admin/server/media";
import { requireAdmin } from "@/features/admin/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function collectionOf(id: string | null | undefined) {
  const c = mediaCollection(id);
  if (!c) throw new NotFoundError("Unknown collection");
  return c;
}

/** Collections, or the files of one (?collection=…&view=files|trash). */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const params = request.nextUrl.searchParams;
  if (!params.get("collection")) {
    return ok(MEDIA_COLLECTIONS.map(({ id, label, area, description }) => ({ id, label, area, description })));
  }
  const list = await listMedia(collectionOf(params.get("collection")), params.get("view") === "trash" ? "trash" : "files");
  const response = ok(list);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});

const editSchema = z.object({
  collection: z.string().min(1),
  key: z.string().min(1).max(1024),
  title: z.string().max(200).nullable().optional(),
  caption: z.string().max(2000).nullable().optional(),
  fileName: z.string().max(140).nullable().optional(),
});

/** Rename a file and/or set its title and caption. */
export const PATCH = withApiHandler(async (request: NextRequest) => {
  const by = requireAdmin(request, { mutating: true });
  const body = editSchema.parse(await request.json());
  return ok(await updateMedia(collectionOf(body.collection), body.key, body, by));
});

const keySchema = z.object({ collection: z.string().min(1), key: z.string().min(1).max(1024) });

/** Move a file to the trash. */
export const DELETE = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request, { mutating: true });
  const body = keySchema.parse(await request.json());
  await deleteMedia(collectionOf(body.collection), body.key);
  return ok({ deleted: body.key });
});
