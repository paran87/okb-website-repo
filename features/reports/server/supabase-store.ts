import "server-only";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type {
  IncidentRecord,
  IncidentSeverity,
  IncidentStatus,
  IncidentSummary,
  ProcessingLogEntry,
  ReviewAction,
} from "@/features/reports/types";
import type { ReportsConfig } from "@/features/reports/server/config";
import { parseRecord, type ReportRow } from "@/features/reports/server/record";
import {
  FLOOD_TYPES,
  IncidentStorageMissingError,
  PROCESSED_STATUSES,
  ReportsBackendError,
  type LightRow,
  type ReportStore,
  type ResolvedListQuery,
} from "@/features/reports/server/store";

/**
 * Reads the OKB Bridge tables through Supabase's REST API (PostgREST) using
 * the service-role key — server-side only. Filtering, search, sorting and
 * pagination all run in the database; the browser only receives one page of
 * already-shaped DTOs.
 *
 * Writes to `okb_bridge_reports` are NEVER made here: the bridge backend keeps
 * reports in memory and would overwrite them. Reviews go through the bridge
 * REST API instead. The only table this module writes is
 * `okb_command_incidents` (owned by the Command Center).
 */

const REPORTS = "okb_bridge_reports";
const LOGS = "okb_bridge_processing_logs";
const INCIDENTS = "okb_command_incidents";
const REPORT_COLUMNS = "id,status,report_type,platform,ai_summary,created_at,updated_at,record";
const INCIDENT_COLUMNS =
  "id,incident_code,report_id,source_location_index,title,incident_type,severity,status,location_text,region,province,municipality,description,created_by,created_at,updated_at";
const TIMEOUT_MS = 12_000;

const log = logger.child({ module: "reports.supabase" });

/** Columns searched by free-text queries. */
const SEARCH_COLUMNS = [
  "record->source->>messageText",
  "record->source->>senderName",
  "record->source->>groupName",
  "ai_summary",
  "record->extraction->>locations",
  "record->extraction->reportTitle->>value",
  "record->extraction->administrative->districtEngineeringOffice->>value",
];

const ADMIN = "record->extraction->administrative";

class TableMissing extends Error {}

/** Value safe inside a PostgREST logic tree (quoted). */
function quotedLike(term: string): string {
  return `"*${term.replace(/["\\*%]/g, "")}*"`;
}

/** Value safe for a plain `ilike.` filter. */
function plainLike(term: string): string {
  return `*${term.replace(/[\\*%]/g, "")}*`;
}

function parseTotal(contentRange: string | null): number | null {
  if (!contentRange) return null;
  const total = contentRange.split("/")[1];
  return total && total !== "*" ? Number(total) : null;
}

interface RestResult {
  data: unknown;
  total: number | null;
}

function toIncident(row: Record<string, unknown>): IncidentRecord {
  const s = (k: string) => (typeof row[k] === "string" ? (row[k] as string) : null);
  return {
    id: s("id") ?? "",
    code: s("incident_code") ?? "",
    reportId: s("report_id") ?? "",
    sourceLocationIndex: typeof row.source_location_index === "number" ? row.source_location_index : null,
    title: s("title") ?? "",
    incidentType: s("incident_type") ?? "other",
    severity: (s("severity") ?? "moderate") as IncidentSeverity,
    status: (s("status") ?? "open") as IncidentStatus,
    locationText: s("location_text"),
    region: s("region"),
    province: s("province"),
    municipality: s("municipality"),
    description: s("description"),
    createdBy: s("created_by") ?? "",
    createdAt: s("created_at") ?? "",
    updatedAt: s("updated_at") ?? s("created_at") ?? "",
  };
}

function toSummary(i: IncidentRecord): IncidentSummary {
  return {
    id: i.id,
    code: i.code,
    title: i.title,
    status: i.status,
    severity: i.severity,
    reportId: i.reportId,
    createdAt: i.createdAt,
  };
}

export function createSupabaseStore(config: ReportsConfig): ReportStore {
  const baseUrl = config.supabaseUrl as string;
  const key = config.supabaseServiceKey as string;

  async function rest(
    table: string,
    params: URLSearchParams,
    opts: { method?: "GET" | "POST"; body?: unknown; count?: boolean } = {},
  ): Promise<RestResult> {
    const url = `${baseUrl}/rest/v1/${table}?${params.toString()}`;
    const prefer: string[] = [];
    if (opts.count) prefer.push("count=exact");
    if (opts.method === "POST") prefer.push("return=representation");
    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          ...(opts.body ? { "Content-Type": "application/json" } : {}),
          ...(prefer.length ? { Prefer: prefer.join(",") } : {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      log.error({ err, table }, "Supabase request failed");
      throw new ReportsBackendError();
    }
    if (!res.ok) {
      let code = "";
      let message = "";
      try {
        const body = (await res.json()) as { code?: string; message?: string };
        code = body.code ?? "";
        message = body.message ?? "";
      } catch {
        /* non-JSON error body */
      }
      if (code === "PGRST205" || code === "42P01" || (res.status === 404 && /relation|table/i.test(message))) {
        throw new TableMissing(table);
      }
      log.error({ status: res.status, code, message, table }, "Supabase query error");
      throw new ReportsBackendError();
    }
    return { data: await res.json(), total: parseTotal(res.headers.get("content-range")) };
  }

  async function reportRows(params: URLSearchParams, count = false) {
    try {
      const { data, total } = await rest(REPORTS, params, { count });
      return { rows: (data as ReportRow[]).map(parseRecord), total };
    } catch (err) {
      if (err instanceof TableMissing) {
        log.error("okb_bridge_reports table not found in the configured Supabase project");
        throw new ReportsBackendError(
          "Report storage was not found in the configured Supabase project. Check OKB_BRIDGE_SUPABASE_URL.",
        );
      }
      throw err;
    }
  }

  async function withIncidents<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof TableMissing) return null;
      throw err;
    }
  }

  return {
    kind: "supabase",
    reviewEnabled: Boolean(config.bridgeApiUrl && config.bridgeAdminToken),

    async listReports(q: ResolvedListQuery) {
      const confirmed = q.status === "confirmed";
      const params = new URLSearchParams({
        select: confirmed ? `${REPORT_COLUMNS},${INCIDENTS}!inner(id)` : REPORT_COLUMNS,
        order: "created_at.desc,id.desc",
        limit: String(q.limit),
        offset: String(q.offset),
      });
      if (q.status === "all") params.append("status", "neq.ignored");
      else if (!confirmed) params.append("status", `eq.${q.status}`);
      if (q.platform) params.append("platform", `eq.${q.platform}`);
      if (q.reportType) params.append("report_type", `eq.${q.reportType}`);
      if (q.group) params.append("record->source->>groupName", `eq.${q.group}`);
      if (q.region) params.append(`${ADMIN}->region->>value`, `eq.${q.region}`);
      if (q.province) params.append(`${ADMIN}->province->>value`, `eq.${q.province}`);
      if (q.municipality) params.append(`${ADMIN}->municipality->>value`, `eq.${q.municipality}`);
      if (q.office) params.append(`${ADMIN}->districtEngineeringOffice->>value`, `eq.${q.office}`);
      if (q.location) params.append("record->extraction->>locations", `ilike.${plainLike(q.location)}`);
      if (q.from) params.append("created_at", `gte.${q.from.toISOString()}`);
      if (q.to) params.append("created_at", `lt.${q.to.toISOString()}`);
      if (q.idPrefix) params.append("record->>id", `ilike.${q.idPrefix}*`);
      if (q.terms.length) {
        // Every word must match at least one searchable column.
        const clauses = q.terms.map(
          (term) => `or(${SEARCH_COLUMNS.map((c) => `${c}.ilike.${quotedLike(term)}`).join(",")})`,
        );
        params.append("and", `(${clauses.join(",")})`);
      }
      try {
        const { rows, total } = await reportRows(params, true);
        return { records: rows, total: total ?? rows.length };
      } catch (err) {
        if (confirmed && err instanceof ReportsBackendError) {
          // The embed fails when the incidents table/relationship is missing.
          const exists = await withIncidents(() => rest(INCIDENTS, new URLSearchParams({ select: "id", limit: "1" })));
          if (exists === null) return { records: [], total: 0 };
        }
        throw err;
      }
    },

    async getReport(id) {
      const params = new URLSearchParams({ select: REPORT_COLUMNS, id: `eq.${id}`, limit: "1" });
      const { rows } = await reportRows(params);
      return rows[0] ?? null;
    },

    async listGroupWindow({ platform, groupName, from, to, limit }) {
      const params = new URLSearchParams({
        select: REPORT_COLUMNS,
        order: "created_at.desc",
        limit: String(limit),
        status: `in.(${PROCESSED_STATUSES.join(",")})`,
        report_type: `in.(${FLOOD_TYPES.join(",")})`,
      });
      params.append("platform", platform ? `eq.${platform}` : "is.null");
      params.append("record->source->>groupName", groupName ? `eq.${groupName}` : "is.null");
      params.append("created_at", `gte.${from.toISOString()}`);
      params.append("created_at", `lte.${to.toISOString()}`);
      return (await reportRows(params)).rows;
    },

    async listFloodReports({ from, to, limit }) {
      const params = new URLSearchParams({
        select: REPORT_COLUMNS,
        order: "created_at.desc",
        limit: String(limit),
        status: `in.(${PROCESSED_STATUSES.join(",")})`,
        report_type: `in.(${FLOOD_TYPES.join(",")})`,
      });
      params.append("created_at", `gte.${from.toISOString()}`);
      params.append("created_at", `lte.${to.toISOString()}`);
      return (await reportRows(params)).rows;
    },

    async listLight({ from, limit }) {
      const params = new URLSearchParams({
        select: [
          "id",
          "platform",
          "status",
          "report_type",
          "created_at",
          "grp:record->source->>groupName",
          `region:${ADMIN}->region->>value`,
          `province:${ADMIN}->province->>value`,
          `municipality:${ADMIN}->municipality->>value`,
          `office:${ADMIN}->districtEngineeringOffice->>value`,
        ].join(","),
        order: "created_at.desc",
        limit: String(limit),
      });
      if (from) params.append("created_at", `gte.${from.toISOString()}`);
      try {
        const { data } = await rest(REPORTS, params);
        return (data as Record<string, string | null | undefined>[]).map(
          (r): LightRow => ({
            id: r.id ?? "",
            platform: r.platform ?? null,
            status: r.status ?? "received",
            reportType: r.report_type ?? null,
            createdAt: r.created_at ?? "",
            groupName: r.grp ?? null,
            region: r.region ?? null,
            province: r.province ?? null,
            municipality: r.municipality ?? null,
            office: r.office ?? null,
          }),
        );
      } catch (err) {
        if (err instanceof TableMissing) throw new ReportsBackendError();
        throw err;
      }
    },

    async countSince(since) {
      const params = new URLSearchParams({ select: "id", limit: "1", status: "neq.ignored" });
      params.append("created_at", `gt.${since.toISOString()}`);
      const { total } = await reportRows(params, true);
      return total ?? 0;
    },

    async processingLog(reportId) {
      const params = new URLSearchParams({
        select: "id,at,event,record",
        report_id: `eq.${reportId}`,
        order: "at.asc",
        limit: "200",
      });
      try {
        const { data } = await rest(LOGS, params);
        return (data as { id: string; at: string; event: string; record: { detail?: unknown } }[]).map(
          (r): ProcessingLogEntry => ({
            id: r.id,
            at: r.at,
            event: r.event,
            detail:
              r.record?.detail && typeof r.record.detail === "object"
                ? (r.record.detail as Record<string, unknown>)
                : null,
          }),
        );
      } catch (err) {
        if (err instanceof TableMissing) return [];
        throw err;
      }
    },

    async review(id: string, action: ReviewAction, reviewer: string, notes: string | null) {
      if (!config.bridgeApiUrl || !config.bridgeAdminToken) {
        throw new ReportsBackendError("Review actions are not configured (OKB_BRIDGE_API_URL / OKB_BRIDGE_ADMIN_TOKEN).");
      }
      let res: Response;
      try {
        res = await fetch(`${config.bridgeApiUrl}/api/v1/reports/${encodeURIComponent(id)}/review`, {
          method: "POST",
          headers: { Authorization: `Bearer ${config.bridgeAdminToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action, reviewer, notes }),
          cache: "no-store",
          // The bridge runs on a free Render instance that may need to wake up.
          signal: AbortSignal.timeout(45_000),
        });
      } catch (err) {
        log.error({ err }, "OKB Bridge review request failed");
        throw new ReportsBackendError("The OKB Bridge backend did not respond. The review was not recorded.");
      }
      if (res.ok) return;
      let message = "";
      try {
        message = ((await res.json()) as { error?: string }).error ?? "";
      } catch {
        /* ignore */
      }
      if (res.status === 404) throw new NotFoundError("Report not found in the OKB Bridge backend.");
      if (res.status === 409 || res.status === 400) throw new ConflictError(message || "The report cannot be reviewed in its current state.");
      log.error({ status: res.status, message }, "OKB Bridge review rejected");
      throw new ReportsBackendError("The OKB Bridge backend rejected the review. It was not recorded.");
    },

    async incidentsForReports(reportIds) {
      if (!reportIds.length) {
        return withIncidents(async () => {
          await rest(INCIDENTS, new URLSearchParams({ select: "id", limit: "1" }));
          return [];
        });
      }
      return withIncidents(async () => {
        const params = new URLSearchParams({
          select: INCIDENT_COLUMNS,
          report_id: `in.(${reportIds.join(",")})`,
          order: "created_at.asc",
          limit: "500",
        });
        const { data } = await rest(INCIDENTS, params);
        return (data as Record<string, unknown>[]).map((r) => toSummary(toIncident(r)));
      });
    },

    async listIncidents({ offset, limit }) {
      return withIncidents(async () => {
        const params = new URLSearchParams({
          select: INCIDENT_COLUMNS,
          order: "created_at.desc",
          limit: String(limit),
          offset: String(offset),
        });
        const { data, total } = await rest(INCIDENTS, params, { count: true });
        const items = (data as Record<string, unknown>[]).map(toIncident);
        return { items, total: total ?? items.length };
      });
    },

    async getIncident(id) {
      const result = await withIncidents(async () => {
        const params = new URLSearchParams({ select: INCIDENT_COLUMNS, id: `eq.${id}`, limit: "1" });
        const { data } = await rest(INCIDENTS, params);
        const row = (data as Record<string, unknown>[])[0];
        return row ? toIncident(row) : null;
      });
      return result ?? null;
    },

    async createIncident(reportId, input, createdBy) {
      const body = {
        report_id: reportId,
        source_location_index: input.sourceLocationIndex,
        title: input.title,
        incident_type: input.incidentType,
        severity: input.severity,
        location_text: input.locationText,
        region: input.region,
        province: input.province,
        municipality: input.municipality,
        description: input.description,
        created_by: createdBy,
      };
      const result = await withIncidents(async () => {
        const { data } = await rest(INCIDENTS, new URLSearchParams({ select: INCIDENT_COLUMNS }), {
          method: "POST",
          body,
        });
        return toIncident((data as Record<string, unknown>[])[0] ?? {});
      });
      if (!result) throw new IncidentStorageMissingError();
      return result;
    },

    async countIncidentsSince(from) {
      return withIncidents(async () => {
        const params = new URLSearchParams({ select: "id", limit: "1" });
        if (from) params.append("created_at", `gte.${from.toISOString()}`);
        const { total } = await rest(INCIDENTS, params, { count: true });
        return total ?? 0;
      });
    },
  };
}
