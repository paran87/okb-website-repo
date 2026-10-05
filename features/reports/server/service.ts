import "server-only";
import { z } from "zod";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import type {
  BridgeReportRecord,
  CountBucket,
  IncidentSummary,
  LocationHistory,
  ReportAnalytics,
  ReportDetail,
  ReportFacets,
  ReportListItem,
  ReportListResult,
  SituationSummary,
} from "@/features/reports/types";
import {
  manilaDayKey,
  manilaDayStart,
  parseReportReference,
  reportReference,
  startOfManilaDay,
  truncate,
} from "@/features/reports/lib/format";
import { platformLabel, reportTypeLabel, statusMeta } from "@/features/reports/lib/labels";
import { floodMetrics, isClear, isFlooded, observeReport, observeWeather, provided } from "@/features/reports/lib/observations";
import { buildSeries, clusterSeries, locationHistory, messageTime, SERIES_WINDOW_HOURS } from "@/features/reports/lib/series";
import type { LightRow, ReportStore, ResolvedListQuery } from "@/features/reports/server/store";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Small TTL cache for aggregate views (per server instance)
// ---------------------------------------------------------------------------

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function invalidateAggregates(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

const optionalText = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => (v && v !== "all" ? v : null));

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  platform: optionalText,
  group: z.string().trim().max(200).optional().transform((v) => (v && v !== "all" ? v : null)),
  status: z
    .enum(["all", "confirmed", "received", "processing", "extracted", "needs_review", "approved", "rejected", "ignored", "failed"])
    .optional()
    .default("all"),
  reportType: optionalText,
  region: optionalText,
  province: optionalText,
  municipality: optionalText,
  office: optionalText,
  location: optionalText,
  datePreset: z.enum(["today", "yesterday", "7d", "30d", "all", "custom"]).optional().default("all"),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.coerce.number().int().refine((n) => [25, 50, 100].includes(n), "pageSize must be 25, 50 or 100").optional().default(25),
});

export function resolveListQuery(params: URLSearchParams, now = new Date()): ResolvedListQuery {
  const raw = Object.fromEntries([...params.entries()].filter(([, v]) => v !== ""));
  const p = listQuerySchema.parse(raw);

  let from: Date | null = null;
  let to: Date | null = null;
  const today = startOfManilaDay(now);
  switch (p.datePreset) {
    case "today":
      from = today;
      break;
    case "yesterday":
      from = new Date(today.getTime() - DAY);
      to = today;
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * DAY);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * DAY);
      break;
    case "custom": {
      from = p.from ? manilaDayStart(p.from) : null;
      const end = p.to ? manilaDayStart(p.to) : null;
      to = end ? new Date(end.getTime() + DAY) : null;
      if ((p.from && !from) || (p.to && !to)) throw new ValidationError("Dates must be YYYY-MM-DD");
      break;
    }
    default:
      break;
  }

  let terms: string[] = [];
  let idPrefix: string | null = null;
  const q = p.q?.trim() ?? "";
  const ref = q ? parseReportReference(q) : null;
  if (ref) idPrefix = ref;
  else if (UUID.test(q)) idPrefix = q.toLowerCase();
  else if (q) {
    terms = q
      .split(/[\s,]+/)
      .map((t) => t.replace(/[()"\\*%]/g, "").trim())
      .filter((t) => t.length >= 2)
      .slice(0, 6);
  }

  return {
    terms,
    idPrefix,
    platform: p.platform,
    group: p.group,
    status: p.status,
    reportType: p.reportType,
    region: p.region,
    province: p.province,
    municipality: p.municipality,
    office: p.office,
    location: p.location,
    from,
    to,
    offset: (p.page - 1) * p.pageSize,
    limit: p.pageSize,
  };
}

// ---------------------------------------------------------------------------
// Report list & detail
// ---------------------------------------------------------------------------

function preview(record: BridgeReportRecord): string {
  const text = record.source.messageText;
  if (!text || !text.trim()) {
    const media = record.source.mediaIndicator?.mediaType;
    return media && media !== "TEXT" ? `[${media.toLowerCase()} message without text]` : "[no message text]";
  }
  return truncate(text, 240);
}

function toListItem(record: BridgeReportRecord, incidents: IncidentSummary[]): ReportListItem {
  const obs = observeReport(record);
  const ex = record.extraction;
  return {
    id: record.id,
    reference: reportReference(record.id, record.createdAt),
    platform: record.platform,
    groupName: record.source.groupName,
    senderName: record.source.senderName,
    messageTime: record.source.messageTimestamp,
    receivedAt: record.source.receivedAt ?? record.createdAt,
    status: record.status,
    reportType: record.reportType,
    preview: preview(record),
    aiSummary: record.summary,
    title: provided(ex?.reportTitle),
    office: provided(ex?.administrative.districtEngineeringOffice) ?? provided(ex?.preparedBy.office),
    region: provided(ex?.administrative.region),
    locationCount: obs.length,
    floodedCount: obs.filter((o) => isFlooded(o.condition)).length,
    clearCount: obs.filter((o) => isClear(o.condition)).length,
    warningCount: record.extractionMeta?.warnings.length ?? 0,
    incidents: incidents.filter((i) => i.reportId === record.id),
  };
}

export async function listReports(store: ReportStore, q: ResolvedListQuery): Promise<ReportListResult> {
  const { records, total } = await store.listReports(q);
  const incidents = await store.incidentsForReports(records.map((r) => r.id));
  return {
    items: records.map((r) => toListItem(r, incidents ?? [])),
    total,
    page: Math.floor(q.offset / q.limit) + 1,
    pageSize: q.limit,
    totalPages: Math.max(1, Math.ceil(total / q.limit)),
    incidentStorage: incidents === null ? "not_configured" : "ready",
  };
}

async function seriesCandidates(store: ReportStore, record: BridgeReportRecord): Promise<BridgeReportRecord[]> {
  const t = Date.parse(record.createdAt);
  return store.listGroupWindow({
    platform: record.platform,
    groupName: record.source.groupName,
    from: new Date(t - SERIES_WINDOW_HOURS * HOUR),
    to: new Date(t + SERIES_WINDOW_HOURS * HOUR),
    limit: 80,
  });
}

const FLOOD_TYPES = new Set(["flood_monitoring", "flood_prone_area_assessment", "non_flood_prone_area_assessment", "other_flood_report"]);

export async function getReportDetail(store: ReportStore, id: string): Promise<ReportDetail> {
  if (!UUID.test(id)) throw new NotFoundError("Report not found");
  const record = await store.getReport(id);
  if (!record) throw new NotFoundError("Report not found");

  const canCompare = Boolean(record.extraction) && FLOOD_TYPES.has(record.reportType ?? "");
  const [candidates, incidents, processingLog] = await Promise.all([
    canCompare ? seriesCandidates(store, record) : Promise.resolve([]),
    store.incidentsForReports([record.id]),
    store.processingLog(record.id),
  ]);
  const series = canCompare ? buildSeries(record, candidates) : null;
  const reviewable = record.status === "extracted" || record.status === "needs_review";
  const busy = record.status === "processing";
  const reviewUnavailableReason = !store.reviewEnabled
    ? "Review actions require OKB_BRIDGE_API_URL and OKB_BRIDGE_ADMIN_TOKEN on the server."
    : null;

  return {
    id: record.id,
    reference: reportReference(record.id, record.createdAt),
    messageId: record.messageId,
    source: record.source,
    status: record.status,
    reportType: record.reportType,
    classification: record.classification,
    aiSummary: record.summary,
    extraction: record.extraction,
    extractionMeta: record.extractionMeta,
    processing: record.processing,
    reviewHistory: record.review.history,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    observations: observeReport(record),
    weather: observeWeather(record),
    series: series?.comparison ?? null,
    seriesNote: series
      ? series.note
      : record.extraction
        ? null
        : "Monitoring comparison is available after AI extraction completes.",
    incidents: incidents ?? [],
    incidentStorage: incidents === null ? "not_configured" : "ready",
    processingLog,
    actions: {
      canMarkReviewed: store.reviewEnabled && reviewable && Boolean(record.extraction),
      canReject: store.reviewEnabled && !busy && record.status !== "rejected",
      canReopen: store.reviewEnabled && (record.status === "approved" || record.status === "rejected"),
      canCreateIncident: incidents !== null && !busy,
      reviewUnavailableReason,
    },
  };
}

export async function getLocationHistory(store: ReportStore, reportId: string, key: string): Promise<LocationHistory> {
  if (!UUID.test(reportId)) throw new NotFoundError("Report not found");
  const record = await store.getReport(reportId);
  if (!record || !record.extraction) throw new NotFoundError("Report not found");
  const result = buildSeries(record, await seriesCandidates(store, record));
  const history = locationHistory(key, result.members, result.comparison?.seriesLabel ?? null);
  if (!history) throw new NotFoundError("Location not found in this report");
  return history;
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

function buckets(rows: LightRow[], keyOf: (r: LightRow) => string | null, labelOf: (k: string) => string = (k) => k, missingLabel?: string): CountBucket[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r) ?? (missingLabel ? "__missing__" : null);
    if (k === null) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key === "__missing__" ? (missingLabel as string) : labelOf(key), count }))
    .sort((a, b) => (a.key === "__missing__" ? 1 : b.key === "__missing__" ? -1 : b.count - a.count));
}

const PROCESSED = new Set(["extracted", "needs_review", "approved", "rejected"]);
const LIGHT_CAP = 5000;

export async function getSituationSummary(store: ReportStore, hours: number): Promise<SituationSummary> {
  return cached(`summary:${store.kind}:${hours}`, 30_000, async () => {
    const to = new Date();
    const from = new Date(to.getTime() - hours * HOUR);
    const [light, floodReports, incidents] = await Promise.all([
      store.listLight({ from, limit: LIGHT_CAP }),
      store.listFloodReports({ from, to, limit: 300 }),
      store.countIncidentsSince(from),
    ]);
    const rows = light.filter((r) => r.status !== "ignored");
    const series = clusterSeries(floodReports).slice(0, 12);
    const latestAiSummaries = floodReports
      .filter((r) => r.summary)
      .slice(0, 6)
      .map((r) => ({
        id: r.id,
        reference: reportReference(r.id, r.createdAt),
        groupName: r.source.groupName,
        messageTime: messageTime(r),
        summary: r.summary as string,
      }));
    return {
      window: { hours, from: from.toISOString(), to: to.toISOString() },
      totals: {
        reports: rows.length,
        aiProcessed: rows.filter((r) => PROCESSED.has(r.status)).length,
        pendingReview: rows.filter((r) => r.status === "extracted" || r.status === "needs_review").length,
        reviewed: rows.filter((r) => r.status === "approved").length,
        failed: rows.filter((r) => r.status === "failed").length,
        confirmedIncidents: incidents,
      },
      bySource: buckets(rows, (r) => r.platform, platformLabel, "Unknown source"),
      byGroup: buckets(rows, (r) => r.groupName, (k) => k, "Unnamed group"),
      byRegion: buckets(rows, (r) => r.region, (k) => k, "Region not reported"),
      byReportType: buckets(rows, (r) => r.reportType, reportTypeLabel, "Not yet classified"),
      series,
      latestAiSummaries,
      // The OKB Bridge backend produces per-report AI summaries only; there is
      // no cross-report AI narrative to show, and none is fabricated here.
      aiSituation: null,
      truncated: light.length >= LIGHT_CAP,
    };
  });
}

export async function getAnalytics(store: ReportStore): Promise<ReportAnalytics> {
  return cached(`analytics:${store.kind}`, 60_000, async () => {
    const now = new Date();
    const days = 30;
    const from = new Date(startOfManilaDay(now).getTime() - (days - 1) * DAY);
    const [light, floodReports, incidents] = await Promise.all([
      store.listLight({ from, limit: LIGHT_CAP }),
      store.listFloodReports({ from: new Date(now.getTime() - 14 * DAY), to: now, limit: 400 }),
      store.countIncidentsSince(from),
    ]);
    const rows = light.filter((r) => r.status !== "ignored");
    const today = startOfManilaDay(now).getTime();
    const since = (ms: number) => rows.filter((r) => Date.parse(r.createdAt) >= ms).length;

    const dayKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) dayKeys.push(manilaDayKey(new Date(today - i * DAY + 12 * HOUR)));
    const perDay = new Map(dayKeys.map((d) => [d, 0]));
    for (const r of rows) {
      const k = manilaDayKey(r.createdAt);
      if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }

    const floodKeys = dayKeys.slice(-14);
    const floodPerDay = new Map(floodKeys.map((d) => [d, { flooded: 0, clear: 0, unknown: 0 }]));
    for (const r of floodReports) {
      const bucket = floodPerDay.get(manilaDayKey(messageTime(r)));
      if (!bucket) continue;
      const m = floodMetrics(observeReport(r));
      bucket.flooded += m.flooded;
      bucket.clear += m.noFlooding;
      bucket.unknown += m.unknown;
    }

    const processed = rows.filter((r) => PROCESSED.has(r.status)).length;
    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

    return {
      generatedAt: now.toISOString(),
      window: { days, from: from.toISOString() },
      received: { today: since(today), week: since(now.getTime() - 7 * DAY), month: rows.length },
      bySource: buckets(rows, (r) => r.platform, platformLabel, "Unknown source"),
      byGroup: buckets(rows, (r) => r.groupName, (k) => k, "Unnamed group"),
      byRegion: buckets(rows, (r) => r.region, (k) => k, "Region not reported"),
      byReportType: buckets(rows, (r) => r.reportType, reportTypeLabel, "Not yet classified"),
      byStatus: buckets(light, (r) => r.status, (k) => statusMeta(k).label),
      rates: {
        aiProcessed: pct(processed, rows.length),
        reviewed: pct(rows.filter((r) => r.status === "approved").length, processed),
        confirmedIncidents: incidents === null ? null : pct(incidents, rows.length),
      },
      daily: dayKeys.map((day) => ({ day, reports: perDay.get(day) ?? 0 })),
      floodDaily: floodKeys.map((day) => ({ day, ...(floodPerDay.get(day) as { flooded: number; clear: number; unknown: number }) })),
      floodSampleSize: floodReports.length,
      truncated: light.length >= LIGHT_CAP,
    };
  });
}

export async function getFacets(store: ReportStore): Promise<ReportFacets> {
  return cached(`facets:${store.kind}`, 5 * 60_000, async () => {
    const rows = await store.listLight({ from: new Date(Date.now() - 180 * DAY), limit: LIGHT_CAP });
    const uniq = (values: (string | null)[]) =>
      [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))].sort((a, b) => a.localeCompare(b));
    const groups = new Map<string, string | null>();
    for (const r of rows) if (r.groupName && !groups.has(r.groupName)) groups.set(r.groupName, r.platform);
    return {
      groups: [...groups.entries()].map(([name, platform]) => ({ name, platform })).sort((a, b) => a.name.localeCompare(b.name)),
      regions: uniq(rows.map((r) => r.region)),
      provinces: uniq(rows.map((r) => r.province)),
      municipalities: uniq(rows.map((r) => r.municipality)),
      offices: uniq(rows.map((r) => r.office)),
    };
  });
}
