import "server-only";

import { ApiError } from "@/lib/api/errors";
import { NCR_DAILY_ACCOMPLISHMENT_EMBED_URL } from "@/lib/constants";

export interface NcrDailyPage {
  page: number;
  /** Signed page image. It expires, so the list is refreshed on a short cache. */
  url: string;
}

const PAGE_RE =
  /\{"bucket":"document-export\.canva\.com","key":"[^"]+","page":(\d+),"pageHash":-?\d+,"height":\d+,"width":\d+,"url":"(https:[^"]+)"\}/g;

/** How long a scraped page list is reused. The image links themselves last about an hour. */
const CACHE_MS = 10 * 60 * 1000;

let cache: { at: number; pages: NcrDailyPage[] } | null = null;

function pagesFromHtml(html: string): NcrDailyPage[] {
  const byPage = new Map<number, string>();
  for (const match of html.matchAll(PAGE_RE)) {
    const page = Number(match[1]);
    const url = match[2]?.replace(/\\u0026/g, "&").replace(/\\\//g, "/");
    if (!page || !url || byPage.has(page)) continue;
    byPage.set(page, url);
  }
  return [...byPage.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([page, url]) => ({ page, url }));
}

/** Every page of the NCR Daily Accomplishment board, in order. */
export async function getNcrDailyPages(): Promise<NcrDailyPage[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.pages;

  const response = await fetch(NCR_DAILY_ACCOMPLISHMENT_EMBED_URL, {
    headers: {
      Accept: "text/html",
      // Canva answers a bare client with "Unsupported client" and no page images.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    next: { revalidate: 600 },
  });
  if (!response.ok) {
    throw new ApiError(502, "INTERNAL_ERROR", "The NCR daily accomplishment board could not be loaded.");
  }

  const pages = pagesFromHtml(await response.text());
  if (!pages.length) {
    throw new ApiError(502, "INTERNAL_ERROR", "The NCR daily accomplishment board could not be loaded.");
  }

  cache = { at: Date.now(), pages };
  return pages;
}
