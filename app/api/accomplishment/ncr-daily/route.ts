import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getNcrDailyPages } from "@/features/accomplishment/server/ncr-daily";

/** Pages of the NCR Daily Accomplishment board, for the public viewer. */
export const GET = withApiHandler(async () => ok(await getNcrDailyPages()));
