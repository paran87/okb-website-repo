import "server-only";
import { ApiError } from "@/lib/api/errors";
import { siteDbConfigured, siteRest, SiteDbMissingError, SiteDbNotConfiguredError } from "@/features/admin/server/supabase";
import { listGallery } from "@/features/admin/server/media";
import driveGallery from "@/lib/config/gallery-drive.json";
import { GALLERY_DRIVE_VIDEOS } from "@/lib/config/gallery-drive-videos";
import { GALLERY_YOUTUBE_VIDEOS } from "@/lib/config/gallery-youtube";

/** Reactions, likes and anonymous comments on Gallery items (okb_gallery_reactions / okb_gallery_comments). */

export const REACTIONS = ["like", "love", "clap", "wow"] as const;
export type Reaction = (typeof REACTIONS)[number];

export interface GalleryComment {
  id: number;
  body: string;
  createdAt: string;
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

/** Only keys of items that are on the Gallery may collect reactions or comments. */
async function assertKnownKey(key: string): Promise<void> {
  if (!key || key.length > 300) throw new ApiError(400, "VALIDATION_ERROR", "Unknown gallery item.");
  const [kind, ...rest] = key.split(":");
  const id = rest.join(":");
  if (kind === "drive") {
    if ((driveGallery.photos as unknown as [string, ...unknown[]][]).some((p) => p[0] === id)) return;
  } else if (kind === "drive-video") {
    if (GALLERY_DRIVE_VIDEOS.some((v) => v.id === id)) return;
  } else if (kind === "youtube") {
    if (GALLERY_YOUTUBE_VIDEOS.some((v) => v.id === id)) return;
  } else {
    const items = await listGallery().catch(() => []);
    if (items.some((i) => i.key === key)) return;
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
      siteRest<{ id: number; body: string; created_at: string }[]>(
        `okb_gallery_comments?select=id,body,created_at&item_key=eq.${q(key)}&hidden=eq.false&order=created_at.desc&limit=100`,
      ),
    ]);
    const counts = { like: 0, love: 0, clap: 0, wow: 0 };
    let mine: Reaction | null = null;
    for (const r of reactions.data ?? []) {
      if (r.reaction in counts) counts[r.reaction]++;
      if (visitor && r.visitor_id === visitor) mine = r.reaction;
    }
    return { enabled: true, counts, mine, comments: (comments.data ?? []).map((c) => ({ id: c.id, body: c.body, createdAt: c.created_at })) };
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
  return { id: row.id, body: row.body, createdAt: row.created_at };
}
