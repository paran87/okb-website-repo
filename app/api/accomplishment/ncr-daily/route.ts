import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { getNcrBoardPages } from "@/features/accomplishment/server/ncr-daily";
import { NCR_BOARDS } from "@/lib/config/ncr-boards";

/**
 * Every page of the NCR accomplishment boards, from the latest to the oldest: the boards are listed newest
 * first and each board's last page is its latest. The images come from ./image (the signed Canva links are
 * long and expire, and the boards have hundreds of pages).
 */
export const GET = withApiHandler(async () => {
  const results = await Promise.allSettled(NCR_BOARDS.map((b) => getNcrBoardPages(b.id)));
  const pages = results.flatMap((result, i) =>
    result.status === "fulfilled"
      ? result.value
          .map(({ page }) => ({ board: NCR_BOARDS[i]!.id, page }))
          .sort((a, b) => b.page - a.page)
      : [],
  );
  if (!pages.length) throw new ApiError(502, "INTERNAL_ERROR", "The NCR accomplishment boards could not be loaded.");
  return ok(pages);
});
