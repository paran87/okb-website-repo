import type { NextRequest } from "next/server";
import { z } from "zod";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { mediaCollection } from "@/features/admin/collections";
import { purgeMedia, restoreMedia } from "@/features/admin/server/media";
import { requireAdmin } from "@/features/admin/server/session";

export const dynamic = "force-dynamic";

const schema = z.object({ collection: z.string().min(1), key: z.string().min(1).max(1100) });

function parse(body: unknown) {
  const parsed = schema.parse(body);
  const c = mediaCollection(parsed.collection);
  if (!c) throw new NotFoundError("Unknown collection");
  return { c, key: parsed.key };
}

/** Restore a file from the trash. */
export const POST = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request, { mutating: true });
  const { c, key } = parse(await request.json());
  return ok(await restoreMedia(c, key));
});

/** Delete a file in the trash forever. */
export const DELETE = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request, { mutating: true });
  const { c, key } = parse(await request.json());
  await purgeMedia(c, key);
  return ok({ deleted: key });
});
