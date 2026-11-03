import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { UnauthorizedError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { takeArchiveSnapshot } from "@/features/accomplishment/server/archive";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Daily accomplishment snapshot (vercel.json → crons). Vercel sends `Authorization: Bearer <CRON_SECRET>` when
 * CRON_SECRET is set; until it is, only Vercel's cron client is accepted. A snapshot is safe to repeat: a second
 * run on the same day records only what changed since the first.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  const allowed = secret ? same(auth, `Bearer ${secret}`) : /^vercel-cron\//.test(request.headers.get("user-agent") ?? "");
  if (!allowed) throw new UnauthorizedError("Not allowed.");
  return ok(await takeArchiveSnapshot());
});
