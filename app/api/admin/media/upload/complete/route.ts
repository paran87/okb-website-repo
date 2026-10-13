import type { NextRequest } from "next/server";
import { z } from "zod";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { mediaCollection } from "@/features/admin/collections";
import { confirmUpload } from "@/features/admin/server/media";
import { requireAdmin } from "@/features/admin/server/session";

export const dynamic = "force-dynamic";

const schema = z.object({ collection: z.string().min(1), key: z.string().min(1).max(1024) });

/** Confirms a direct upload reached storage and refreshes the galleries. */
export const POST = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request, { mutating: true });
  const body = schema.parse(await request.json());
  const c = mediaCollection(body.collection);
  if (!c) throw new NotFoundError("Unknown collection");
  await confirmUpload(c, body.key);
  return ok({ key: body.key });
});
