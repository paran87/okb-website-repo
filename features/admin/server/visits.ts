import "server-only";
import { siteRest } from "@/features/admin/server/supabase";
import type {
  BreakdownRow,
  StatsRange,
  VisitArea,
  VisitPage,
  VisitRecord,
  VisitStats,
} from "@/features/admin/types";

/** Visit log (okb_site_visits) reads and writes. */

const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila, no DST

export interface NewVisit {
  visitor_id: string;
  session_id: string;
  is_new_visitor: boolean;
  area: VisitArea;
  path: string;
  page_title: string | null;
  referrer: string | null;
  referrer_host: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string;
  browser: string;
  os: string;
  screen: string | null;
  language: string | null;
}

export async function recordVisit(visit: NewVisit): Promise<void> {
  await siteRest("okb_site_visits", { method: "POST", body: visit, prefer: ["return=minimal"], timeoutMs: 5_000 });
}

/** Start of today in Manila, as a UTC instant. */
function manilaMidnight(now: Date): Date {
  const local = new Date(now.getTime() + TZ_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TZ_OFFSET_MS);
}

export function rangeBounds(range: StatsRange, now = new Date()): { from: Date; to: Date; bucket: "hour" | "day" } {
  const midnight = manilaMidnight(now);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 1;
  const from = new Date(midnight.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { from, to: now, bucket: range === "today" ? "hour" : "day" };
}

/** Manila local timestamp label (no zone), matching what Postgres returns for the buckets. */
function localLabel(instant: Date): string {
  return new Date(instant.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 19);
}

function fillSeries(
  rows: { t: string; views: number; visitors: number }[],
  from: Date,
  to: Date,
  bucket: "hour" | "day",
): VisitStats["series"] {
  const byKey = new Map(rows.map((r) => [r.t.slice(0, 19), r]));
  const step = bucket === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const out: VisitStats["series"] = [];
  // `from` is a Manila midnight, so stepping keeps bucket boundaries aligned.
  const end = bucket === "hour" ? manilaMidnight(to).getTime() + 24 * step : to.getTime();
  for (let t = from.getTime(); t < end; t += step) {
    const key = localLabel(new Date(t));
    const hit = byKey.get(key);
    out.push({ t: key, views: hit?.views ?? 0, visitors: hit?.visitors ?? 0 });
  }
  return out;
}

type RawStats = Omit<VisitStats, "range" | "bucket" | "from" | "to">;

export async function getVisitStats(range: StatsRange, area: VisitArea | null): Promise<VisitStats> {
  const { from, to, bucket } = rangeBounds(range);
  const { data } = await siteRest<RawStats>("rpc/okb_site_visit_stats", {
    method: "POST",
    body: { p_from: from.toISOString(), p_to: to.toISOString(), p_bucket: bucket, p_area: area },
    timeoutMs: 20_000,
  });
  const rows = (k: keyof RawStats) => (Array.isArray(data?.[k]) ? (data[k] as BreakdownRow[]) : []);
  return {
    range,
    bucket,
    from: from.toISOString(),
    to: to.toISOString(),
    pageViews: Number(data?.pageViews ?? 0),
    visitors: Number(data?.visitors ?? 0),
    sessions: Number(data?.sessions ?? 0),
    newVisitors: Number(data?.newVisitors ?? 0),
    liveVisitors: Number(data?.liveVisitors ?? 0),
    series: fillSeries(Array.isArray(data?.series) ? data.series : [], from, to, bucket),
    hours: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      views: (Array.isArray(data?.hours) ? data.hours : []).find((h) => h.hour === hour)?.views ?? 0,
    })),
    areas: rows("areas"),
    pages: rows("pages"),
    countries: rows("countries"),
    cities: rows("cities"),
    devices: rows("devices"),
    browsers: rows("browsers"),
    os: rows("os"),
    referrers: rows("referrers"),
  };
}

const COLUMNS =
  "id,occurred_at,visitor_id,is_new_visitor,area,path,page_title,referrer_host,country,region,city,device,browser,os,screen,language";

function toRecord(row: Record<string, unknown>): VisitRecord {
  const s = (k: string) => (typeof row[k] === "string" && row[k] !== "" ? (row[k] as string) : null);
  return {
    id: Number(row.id),
    occurredAt: s("occurred_at") ?? "",
    visitorId: s("visitor_id") ?? "",
    isNewVisitor: row.is_new_visitor === true,
    area: row.area === "command" ? "command" : "website",
    path: s("path") ?? "/",
    pageTitle: s("page_title"),
    referrerHost: s("referrer_host"),
    country: s("country"),
    region: s("region"),
    city: s("city"),
    device: s("device"),
    browser: s("browser"),
    os: s("os"),
    screen: s("screen"),
    language: s("language"),
  };
}

export interface VisitQuery {
  range: StatsRange;
  area: VisitArea | null;
  search: string | null;
  page: number;
  pageSize: number;
}

function filterParams(q: Omit<VisitQuery, "page" | "pageSize">): URLSearchParams {
  const { from, to } = rangeBounds(q.range);
  const params = new URLSearchParams();
  params.append("occurred_at", `gte.${from.toISOString()}`);
  params.append("occurred_at", `lt.${to.toISOString()}`);
  if (q.area) params.set("area", `eq.${q.area}`);
  const term = q.search?.replace(/[(),*%\\"]/g, " ").trim();
  if (term) {
    const like = `*${term}*`;
    params.set("or", `(path.ilike.${like},page_title.ilike.${like},city.ilike.${like},region.ilike.${like},browser.ilike.${like})`);
  }
  return params;
}

export async function listVisits(q: VisitQuery): Promise<VisitPage> {
  const params = filterParams(q);
  params.set("select", COLUMNS);
  params.set("order", "occurred_at.desc,id.desc");
  params.set("limit", String(q.pageSize));
  params.set("offset", String((q.page - 1) * q.pageSize));
  const { data, total } = await siteRest<Record<string, unknown>[]>(`okb_site_visits?${params}`, {
    prefer: ["count=exact"],
  });
  return { items: (data ?? []).map(toRecord), total: total ?? 0, page: q.page, pageSize: q.pageSize };
}

const EXPORT_LIMIT = 50_000;
const EXPORT_PAGE = 1000;

/** Every visit in the range (newest first), up to EXPORT_LIMIT. */
export async function exportVisits(q: Omit<VisitQuery, "page" | "pageSize">): Promise<VisitRecord[]> {
  const out: VisitRecord[] = [];
  for (let offset = 0; offset < EXPORT_LIMIT; offset += EXPORT_PAGE) {
    const params = filterParams(q);
    params.set("select", COLUMNS);
    params.set("order", "occurred_at.desc,id.desc");
    params.set("limit", String(EXPORT_PAGE));
    params.set("offset", String(offset));
    const { data } = await siteRest<Record<string, unknown>[]>(`okb_site_visits?${params}`);
    const rows = data ?? [];
    out.push(...rows.map(toRecord));
    if (rows.length < EXPORT_PAGE) break;
  }
  return out;
}
