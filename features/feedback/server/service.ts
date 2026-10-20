import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, BadRequestError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { siteRest } from "@/features/admin/server/supabase";
import { parseAgent } from "@/features/admin/server/user-agent";
import { deleteObject, getOperationsR2Config, putObject, R2Error } from "@/features/operations/server/r2";
import {
  FEEDBACK_AREAS,
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_SCREENSHOT_MAX_BYTES,
  FEEDBACK_STATUSES,
  feedbackReference,
  type FeedbackItem,
  type FeedbackList,
  type FeedbackStatus,
} from "@/features/feedback/lib/options";

/**
 * "Report a problem" (okb_site_feedback): visitors of the website, the Command Center and OKB Mobile send a
 * short description (and optionally a screenshot and a way to reach them); admins track each one in
 * Admin → Feedback until it is fixed. Screenshots go to the operations R2 bucket under site-feedback/ and are
 * served to signed-in admins only.
 */

const log = logger.child({ module: "feedback" });
const TABLE = "okb_site_feedback";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SCREENSHOT_KEY = /^site-feedback\/\d{4}\/\d{2}\/[0-9a-f-]{36}\/[0-9a-f]{16}\.(jpg|png|webp)$/;

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((x) => x.id) as [T[number]["id"], ...T[number]["id"][]];
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const inputSchema = z.object({
  category: z.enum(ids(FEEDBACK_CATEGORIES)),
  area: z.enum(ids(FEEDBACK_AREAS)),
  pageUrl: z.string().trim().min(1).max(1024),
  pageTitle: text(300),
  message: z
    .string()
    .trim()
    .min(FEEDBACK_MESSAGE_MIN, "Please describe the problem in a few words.")
    .max(FEEDBACK_MESSAGE_MAX, "Please keep it under 2,000 characters."),
  contact: text(120),
  screen: text(20),
  /** Honeypot: always empty for people. */
  website: z.string().max(200).optional(),
});

/** Only this site's own pages: the path and query of the page the report was sent from. */
function samePagePath(raw: string): string {
  try {
    const url = new URL(raw, "https://okb.local");
    return `${url.pathname}${url.search}`.slice(0, 1024);
  } catch {
    throw new ValidationError("Invalid page.");
  }
}

const IMAGE_TYPES = [
  { ext: "jpg", type: "image/jpeg", magic: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", type: "image/png", magic: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    ext: "webp",
    type: "image/webp",
    magic: (b: Uint8Array) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
] as const;

async function storeScreenshot(id: string, file: File): Promise<string> {
  if (file.size === 0) throw new BadRequestError("The screenshot is empty.");
  if (file.size > FEEDBACK_SCREENSHOT_MAX_BYTES) throw new BadRequestError("The screenshot is too large (4 MB at most).");
  const bytes = await file.arrayBuffer();
  const head = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength));
  const kind = IMAGE_TYPES.find((t) => t.magic(head));
  if (!kind) throw new BadRequestError("The screenshot must be a JPEG, PNG or WebP image.");
  const cfg = getOperationsR2Config();
  if (!cfg) throw new ApiError(503, "INTERNAL_ERROR", "Screenshots cannot be stored right now. Send the report without one.");
  const now = new Date(Date.now() + 8 * 3_600_000);
  const key = `site-feedback/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}/${randomBytes(8).toString("hex")}.${kind.ext}`;
  try {
    await putObject(cfg, key, bytes, kind.type);
  } catch (err) {
    log.error({ err: err instanceof R2Error ? { code: err.code, status: err.status } : err }, "Feedback screenshot upload failed");
    throw new ApiError(503, "INTERNAL_ERROR", "The screenshot could not be saved. Send the report without it, or try again.");
  }
  return key;
}

/** A report from the "Report a problem" form (multipart: the fields and an optional `screenshot` file). */
export async function submitFeedback(form: FormData, userAgent: string): Promise<{ reference: string }> {
  const field = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v : undefined;
  };
  const input = inputSchema.parse({
    category: field("category"),
    area: field("area"),
    pageUrl: field("pageUrl"),
    pageTitle: field("pageTitle"),
    message: field("message"),
    contact: field("contact"),
    screen: field("screen"),
    website: field("website"),
  });
  if (input.website) throw new BadRequestError("Report rejected.");
  const id = randomUUID();
  const file = form.get("screenshot");
  const screenshotKey = file instanceof File && file.size > 0 ? await storeScreenshot(id, file) : null;
  const agent = userAgent ? parseAgent(userAgent) : null;
  try {
    await siteRest(TABLE, {
      method: "POST",
      prefer: ["return=minimal"],
      body: {
        id,
        category: input.category,
        area: input.area,
        page_url: samePagePath(input.pageUrl),
        page_title: input.pageTitle,
        message: input.message,
        contact: input.contact,
        screenshot_key: screenshotKey,
        device: agent ? `${agent.browser} on ${agent.os} (${agent.device})`.slice(0, 120) : null,
        user_agent: userAgent.slice(0, 512) || null,
        screen: input.screen && /^\d{2,5}x\d{2,5}$/.test(input.screen) ? input.screen : null,
      },
    });
  } catch (err) {
    if (screenshotKey) {
      const cfg = getOperationsR2Config();
      if (cfg) await deleteObject(cfg, screenshotKey).catch(() => undefined);
    }
    log.error({ err }, "Feedback not saved");
    // The sender does not need to know about the Admin tables; tell them where else to go.
    throw new ApiError(503, "INTERNAL_ERROR", "Your report could not be sent right now. Please try again later, or e-mail okb@dpwh.gov.ph.");
  }
  log.info({ id, category: input.category, area: input.area, screenshot: Boolean(screenshotKey) }, "Feedback received");
  return { reference: feedbackReference(id) };
}

// ---------------------------------------------------------------------------
// Admin → Feedback
// ---------------------------------------------------------------------------

interface Row {
  id: string;
  created_at: string;
  updated_at: string;
  category: FeedbackItem["category"];
  area: FeedbackItem["area"];
  page_url: string;
  page_title: string | null;
  message: string;
  contact: string | null;
  screenshot_key: string | null;
  device: string | null;
  screen: string | null;
  status: FeedbackStatus;
  admin_note: string | null;
  handled_by: string | null;
  resolved_at: string | null;
}

const COLUMNS = "id,created_at,updated_at,category,area,page_url,page_title,message,contact,screenshot_key,device,screen,status,admin_note,handled_by,resolved_at";

function toItem(r: Row): FeedbackItem {
  return {
    id: r.id,
    reference: feedbackReference(r.id),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    category: r.category,
    area: r.area,
    pageUrl: r.page_url,
    pageTitle: r.page_title,
    message: r.message,
    contact: r.contact,
    screenshotUrl: r.screenshot_key ? `/api/admin/feedback/screenshot?key=${encodeURIComponent(r.screenshot_key)}` : null,
    device: r.device,
    screen: r.screen,
    status: r.status,
    adminNote: r.admin_note,
    handledBy: r.handled_by,
    resolvedAt: r.resolved_at,
  };
}

/** Reports, newest first: [status] "open" (new + in progress), one status, or "all". */
export async function listFeedback(status: string): Promise<FeedbackList> {
  const filter =
    status === "open"
      ? "&status=in.(new,in_progress)"
      : FEEDBACK_STATUSES.some((s) => s.id === status)
        ? `&status=eq.${status}`
        : "";
  const [list, open] = await Promise.all([
    siteRest<Row[]>(`${TABLE}?select=${COLUMNS}${filter}&order=created_at.desc&limit=300`),
    siteRest<unknown[]>(`${TABLE}?select=id&status=in.(new,in_progress)&limit=1`, { prefer: ["count=exact"] }),
  ]);
  return { items: (list.data ?? []).map(toItem), open: open.total ?? 0 };
}

const updateSchema = z.object({
  status: z.enum(ids(FEEDBACK_STATUSES)).optional(),
  adminNote: text(2000).optional(),
});

/** An admin moves a report along (New → In progress → Fixed / Won't fix) or notes what was done. */
export async function updateFeedback(id: string, admin: string, body: unknown): Promise<FeedbackItem> {
  if (!UUID.test(id)) throw new NotFoundError("Report not found.");
  const input = updateSchema.parse(body);
  const at = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: at, handled_by: admin.slice(0, 100) };
  if (input.status) {
    patch.status = input.status;
    patch.resolved_at = input.status === "fixed" || input.status === "wont_fix" ? at : null;
  }
  if (input.adminNote !== undefined) patch.admin_note = input.adminNote;
  const res = await siteRest<Row[]>(`${TABLE}?id=eq.${id}&select=${COLUMNS}`, { method: "PATCH", body: patch, prefer: ["return=representation"] });
  const row = res.data?.[0];
  if (!row) throw new NotFoundError("This report no longer exists.");
  return toItem(row);
}

/** Deletes a report (spam, a test) and its screenshot. */
export async function deleteFeedback(id: string): Promise<void> {
  if (!UUID.test(id)) throw new NotFoundError("Report not found.");
  const res = await siteRest<{ screenshot_key: string | null }[]>(`${TABLE}?id=eq.${id}&select=screenshot_key`, {
    method: "DELETE",
    prefer: ["return=representation"],
  });
  const key = res.data?.[0]?.screenshot_key;
  const cfg = getOperationsR2Config();
  if (key && cfg && SCREENSHOT_KEY.test(key)) await deleteObject(cfg, key).catch((err) => log.warn({ err, key }, "Feedback screenshot not deleted"));
}
