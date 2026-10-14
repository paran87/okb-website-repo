import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getMapLines } from "@/features/accomplishment/server/public-dashboard";

/** Shared by the CDN for 10 minutes (the sheet tabs themselves are cached as long), then refreshed in the background. */
const CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

/** Every traced waterway line (WaterwayVsCoordinates) as cleaned and remaining stretches. */
export const GET = withApiHandler(async () => {
  const response = ok(await getMapLines());
  response.headers.set("Cache-Control", CACHE);
  return response;
});
