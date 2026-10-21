import "server-only";
import { ApiError } from "@/lib/api/errors";
import { siteDbConfigured, siteRest, SiteDbMissingError, SiteDbNotConfiguredError } from "@/features/admin/server/supabase";
import { listGallery, listGallerySections } from "@/features/admin/server/media";
import { NCR_BOARDS } from "@/lib/config/ncr-boards";
import driveGallery from "@/lib/config/gallery-drive.json";
import { GALLERY_DRIVE_VIDEOS } from "@/lib/config/gallery-drive-videos";
import { GALLERY_YOUTUBE_VIDEOS } from "@/lib/config/gallery-youtube";

/**
 * Reactions, likes and anonymous comments on Gallery items and on the photos and videos of flood reports on the
 * OKB Mobile map (okb_gallery_reactions / okb_gallery_comments). A flood report's media is keyed
 * `flood:<storage key>`; its reactions and comments are removed with the report.
 */

export const REACTIONS = ["like", "love", "clap", "wow"] as const;
export type Reaction = (typeof REACTIONS)[number];

export interface GalleryComment {
  id: number;
  body: string;
  createdAt: string;
  /** Written from this browser (same visitor id): it may be edited or deleted. The id itself is never sent. */
  mine: boolean;
}

export interface Engagement {
  /** False until the engagement tables exist in Supabase. */
  enabled: boolean;
  counts: Record<Reaction, number>;
  mine: Reaction | null;
  comments: GalleryComment[];
}

const EMPTY: Engagement = { enabled: false, counts: { like: 0, love: 0, clap: 0, wow: 0 }, mine: null, comments: [] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMMENT_MAX = 500;
const HOURLY_LIMIT = 5;

export const isVisitorId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** The report a flood photo or video belongs to: its id is part of the storage key. */
const FLOOD_MEDIA = [
  /^flood-reports\/\d{4}\/\d{2}\/\d{2}\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f]{16}\.(jpg|mp4|webm|mov)$/,
  /^report-media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f]{16}\.(jpg|jpeg|png|webp|mp4|m4v|mov|webm|3gp)$/,
];
/** Reports already found (report id → when), so reading comments does not look the report up every time. */
const knownReports = new Map<string, number>();

async function assertFloodMedia(storageKey: string): Promise<boolean> {
  const id = FLOOD_MEDIA.map((re) => re.exec(storageKey)?.[1]).find(Boolean);
  if (!id) return false;
  const seen = knownReports.get(id);
  if (seen && Date.now() - seen < 10 * 60_000) return true;
  const { assertReportExists } = await import("@/features/flood-report/server/service");
  try {
    await assertReportExists(id);
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 404) return false;
    throw e;
  }
  knownReports.set(id, Date.now());
  return true;
}

/** Removes the reactions and comments of a deleted flood report's photos and videos. */
export async function forgetFloodReport(reportId: string): Promise<void> {
  if (!UUID.test(reportId) || !siteDbConfigured()) return;
  knownReports.delete(reportId.toLowerCase());
  const match = `item_key=like.${q(`flood:*${reportId.toLowerCase()}*`)}`;
  await Promise.all([
    siteRest(`okb_gallery_reactions?${match}`, { method: "DELETE" }),
    siteRest(`okb_gallery_comments?${match}`, { method: "DELETE" }),
  ]).catch(() => undefined);
}

/** Only keys of items that are on the Gallery (or of flood report photos on the map) may collect reactions or comments. */
async function assertKnownKey(key: string): Promise<void> {
  if (!key || key.length > 300) throw new ApiError(400, "VALIDATION_ERROR", "Unknown gallery item.");
  const [kind, ...rest] = key.split(":");
  const id = rest.join(":");
  if (kind === "drive") {
    if ((driveGallery.photos as unknown as [string, ...unknown[]][]).some((p) => p[0] === id)) return;
  } else if (kind === "drive-video") {
    if (GALLERY_DRIVE_VIDEOS.some((v) => v.id === id)) return;
  } else if (kind === "ncr") {
    // ncr:<board>:<page>
    const [board, page] = id.split(":");
    if (NCR_BOARDS.some((b) => b.id === board) && /^\d{1,4}$/.test(page ?? "") && Number(page) >= 1) return;
  } else if (kind === "youtube") {
    if (GALLERY_YOUTUBE_VIDEOS.some((v) => v.id === id)) return;
  } else if (kind === "flood") {
    if (await assertFloodMedia(id)) return;
  } else {
    const [main, extra] = await Promise.all([listGallery(), listGallerySections()]);
    if ([...main, ...extra.inspections, ...extra.summit].some((i) => i.key === key)) return;
  }
  throw new ApiError(404, "NOT_FOUND", "Unknown gallery item.");
}

const q = encodeURIComponent;

export async function getEngagement(key: string, visitor: string | null): Promise<Engagement> {
  if (!siteDbConfigured()) return EMPTY;
  await assertKnownKey(key);
  try {
    const [reactions, comments] = await Promise.all([
      siteRest<{ visitor_id: string; reaction: Reaction }[]>(`okb_gallery_reactions?select=visitor_id,reaction&item_key=eq.${q(key)}&limit=10000`),
      siteRest<{ id: number; visitor_id: string; body: string; created_at: string }[]>(
        `okb_gallery_comments?select=id,visitor_id,body,created_at&item_key=eq.${q(key)}&hidden=eq.false&order=created_at.desc&limit=100`,
      ),
    ]);
    const counts = { like: 0, love: 0, clap: 0, wow: 0 };
    let mine: Reaction | null = null;
    for (const r of reactions.data ?? []) {
      if (r.reaction in counts) counts[r.reaction]++;
      if (visitor && r.visitor_id === visitor) mine = r.reaction;
    }
    return { enabled: true, counts, mine, comments: (comments.data ?? []).map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.created_at,
        mine: Boolean(visitor) && c.visitor_id === visitor,
      })),
    };
  } catch (e) {
    if (e instanceof SiteDbMissingError || e instanceof SiteDbNotConfiguredError) return EMPTY;
    throw e;
  }
}

/** Sets (or, with null, removes) the visitor's one reaction on an item. */
export async function setReaction(key: string, visitor: string, reaction: Reaction | null): Promise<void> {
  await assertKnownKey(key);
  if (reaction === null) {
    await siteRest(`okb_gallery_reactions?item_key=eq.${q(key)}&visitor_id=eq.${visitor}`, { method: "DELETE" });
    return;
  }
  await siteRest("okb_gallery_reactions?on_conflict=item_key,visitor_id", {
    method: "POST",
    body: { item_key: key, visitor_id: visitor, reaction, updated_at: new Date().toISOString() },
    prefer: ["resolution=merge-duplicates", "return=minimal"],
  });
}

/** Cleans a comment, or throws why it cannot be posted. */
export function cleanComment(raw: unknown): string {
  const body = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!body) throw new ApiError(400, "VALIDATION_ERROR", "Write a comment first.");
  if (body.length > COMMENT_MAX) throw new ApiError(400, "VALIDATION_ERROR", `Comments can be up to ${COMMENT_MAX} characters.`);
  if (/https?:\/\/|www\.|\.(com|net|org|ph|io|xyz)\b/i.test(body)) throw new ApiError(400, "VALIDATION_ERROR", "Please leave links out of comments.");
  return body;
}

export async function addComment(key: string, visitor: string, raw: unknown): Promise<GalleryComment> {
  const body = cleanComment(raw);
  await assertKnownKey(key);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const recent = await siteRest<{ id: number; item_key: string; body: string }[]>(
    `okb_gallery_comments?select=id,item_key,body&visitor_id=eq.${visitor}&created_at=gte.${q(since)}&limit=20`,
  );
  if ((recent.data ?? []).length >= HOURLY_LIMIT) throw new ApiError(429, "RATE_LIMITED", "You have commented a lot in the last hour. Please try again later.");
  if ((recent.data ?? []).some((c) => c.item_key === key && c.body === body)) throw new ApiError(409, "CONFLICT", "You already posted that comment.");
  const res = await siteRest<{ id: number; body: string; created_at: string }[]>("okb_gallery_comments?select=id,body,created_at", {
    method: "POST",
    body: { item_key: key, visitor_id: visitor, body },
    prefer: ["return=representation"],
  });
  const row = res.data?.[0];
  if (!row) throw new ApiError(502, "INTERNAL_ERROR", "The comment could not be saved.");
  return { id: row.id, body: row.body, createdAt: row.created_at, mine: true };
}

/** The filter for one visible comment of this item written by this visitor; nobody else's comment ever matches. */
function ownComment(key: string, visitor: string, id: unknown): string {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "VALIDATION_ERROR", "Unknown comment.");
  return `okb_gallery_comments?id=eq.${id}&item_key=eq.${q(key)}&visitor_id=eq.${visitor}&hidden=eq.false`;
}

const NOT_YOURS = "This comment can only be changed from the browser it was written in.";

/** Replaces the text of the visitor's own comment. */
export async function editComment(key: string, visitor: string, id: unknown, raw: unknown): Promise<GalleryComment> {
  const body = cleanComment(raw);
  const res = await siteRest<{ id: number; body: string; created_at: string }[]>(`${ownComment(key, visitor, id)}&select=id,body,created_at`, {
    method: "PATCH",
    body: { body },
    prefer: ["return=representation"],
  });
  const row = res.data?.[0];
  if (!row) throw new ApiError(404, "NOT_FOUND", NOT_YOURS);
  return { id: row.id, body: row.body, createdAt: row.created_at, mine: true };
}

/** Deletes the visitor's own comment for good. */
export async function deleteComment(key: string, visitor: string, id: unknown): Promise<void> {
  const res = await siteRest<{ id: number }[]>(`${ownComment(key, visitor, id)}&select=id`, {
    method: "DELETE",
    prefer: ["return=representation"],
  });
  if (!res.data?.length) throw new ApiError(404, "NOT_FOUND", NOT_YOURS);
}

export interface EngagementSummary {
  enabled: boolean;
  /** Per item key: reaction counts and how many comments. */
  items: Record<string, { counts: Record<Reaction, number>; comments: number }>;
}

/** Reaction and comment counts for the items on screen (the Gallery grid and list). */
export async function getSummary(keys: string[]): Promise<EngagementSummary> {
  const unique = [...new Set(keys.filter((k) => typeof k === "string" && k.length > 0 && k.length <= 300))].slice(0, 100);
  if (!siteDbConfigured() || !unique.length) return { enabled: siteDbConfigured(), items: {} };
  const list = `in.(${unique.map((k) => `"${k.replace(/"/g, "")}"`).join(",")})`;
  try {
    const [reactions, comments] = await Promise.all([
      siteRest<{ item_key: string; reaction: Reaction }[]>(`okb_gallery_reactions?select=item_key,reaction&item_key=${q(list)}&limit=50000`),
      siteRest<{ item_key: string }[]>(`okb_gallery_comments?select=item_key&hidden=eq.false&item_key=${q(list)}&limit=50000`),
    ]);
    const items: EngagementSummary["items"] = {};
    const slot = (k: string) => (items[k] ??= { counts: { like: 0, love: 0, clap: 0, wow: 0 }, comments: 0 });
    for (const r of reactions.data ?? []) if (r.reaction in slot(r.item_key).counts) slot(r.item_key).counts[r.reaction]++;
    for (const c of comments.data ?? []) slot(c.item_key).comments++;
    return { enabled: true, items };
  } catch (e) {
    if (e instanceof SiteDbMissingError || e instanceof SiteDbNotConfiguredError) return { enabled: false, items: {} };
    throw e;
  }
}
