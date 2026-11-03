import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getArchive, parsePeriod } from "@/features/accomplishment/server/archive";

export const dynamic = "force-dynamic";

/** Snapshots are taken once a day, so the CDN may share an answer for 10 minutes. */
const CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

/** The accomplishment archive: daily totals and the changes of a period (?days=7|30|90|365|all). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const response = ok(await getArchive(parsePeriod(request.nextUrl.searchParams.get("days"))));
  response.headers.set("Cache-Control", CACHE);
  return response;
});
