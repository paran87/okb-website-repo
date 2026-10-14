import "server-only";

import { ApiError } from "@/lib/api/errors";
import { ncrBoard } from "@/lib/config/ncr-boards";

export interface NcrDailyPage {
  page: number;
  /** Signed image of the page (the widest Canva lists for it). It expires, so the list is refreshed on a short cache. */
  url: string;
}

/**
 * The view page lists every page of the design (the ?embed page stops at the first 20). Each page has a
 * 596px thumbnail; the page Canva opens first also has a 1024px preview. The widest one is used.
 */
const PAGE_RE =
  /\{"bucket":"document-export\.canva\.com","key":"[^"]+","page":(\d+),"pageHash":-?\d+,"height":\d+,"width":(\d+),"url":"(https:[^"]+)"\}/g;

/** How long a scraped page list is reused. The image links themselves last about an hour. */
const CACHE_MS = 10 * 60 * 1000;

const cache = new Map<string, { at: number; pages: NcrDailyPage[] }>();

function pagesFromHtml(html: string): NcrDailyPage[] {
  const byPage = new Map<number, { width: number; url: string }>();
  for (const match of html.matchAll(PAGE_RE)) {
    const page = Number(match[1]);
    const width = Number(match[2]);
    const url = match[3]?.replace(/\\u0026/g, "&").replace(/\\\//g, "/");
    if (!page || !url) continue;
    if ((byPage.get(page)?.width ?? 0) >= width) continue;
    byPage.set(page, { width, url });
  }
  return [...byPage.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([page, { url }]) => ({ page, url }));
}

/** Every page of one Canva board, in the order of the design (the first page is the oldest). */
export async function getNcrBoardPages(boardId: string): Promise<NcrDailyPage[]> {
  const board = ncrBoard(boardId);
  if (!board) throw new ApiError(404, "NOT_FOUND", "Unknown board.");
  const hit = cache.get(board.id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.pages;

  const response = await fetch(board.url, {
    headers: {
      Accept: "text/html",
      // Canva answers a bare client with "Unsupported client" and no page images.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(502, "INTERNAL_ERROR", "The NCR accomplishment board could not be loaded.");
  }

  const pages = pagesFromHtml(await response.text());
  if (!pages.length) {
    throw new ApiError(502, "INTERNAL_ERROR", "The NCR accomplishment board could not be loaded.");
  }

  cache.set(board.id, { at: Date.now(), pages });
  return pages;
}
