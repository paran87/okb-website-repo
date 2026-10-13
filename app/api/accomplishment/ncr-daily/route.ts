import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getNcrDailyPages } from "@/features/accomplishment/server/ncr-daily";

/**
 * Page numbers of the NCR Daily Accomplishment board, for the public viewer. The images themselves come from
 * ./image (the signed Canva links are long and expire, and the board has hundreds of pages).
 */
export const GET = withApiHandler(async () => {
  const pages = await getNcrDailyPages();
  return ok(pages.map(({ page }) => ({ page })));
});
