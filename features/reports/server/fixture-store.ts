import "server-only";
import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import type { BridgeReportRecord, IncidentRecord } from "@/features/reports/types";
import { manilaDayKey } from "@/features/reports/lib/format";
import { buildDevFixtures } from "@/features/reports/server/dev-fixtures";
import {
  FLOOD_TYPES,
  PROCESSED_STATUSES,
  type LightRow,
  type ReportStore,
  type ResolvedListQuery,
} from "@/features/reports/server/store";

/**
 * In-memory store over the development fixtures (see dev-fixtures.ts).
 * Mirrors the Supabase store's semantics so the UI can be exercised without a
 * backend. Never constructed in production (see getReportStore()).
 */

const state = globalThis as unknown as {
  __okbReportFixtures?: { reports: BridgeReportRecord[]; incidents: IncidentRecord[]; seq: number };
};

function db() {
  state.__okbReportFixtures ??= { reports: buildDevFixtures(), incidents: [], seq: 0 };
  return state.__okbReportFixtures;
}

const byNewest = (a: BridgeReportRecord, b: BridgeReportRecord) => b.createdAt.localeCompare(a.createdAt);

function haystack(r: BridgeReportRecord): string {
  const ex = r.extraction;
  return [
    r.source.messageText,
    r.source.senderName,
    r.source.groupName,
    r.summary,
    ex ? JSON.stringify(ex.locations) : "",
    ex?.reportTitle.value,
    ex?.administrative.districtEngineeringOffice.value,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function inWindow(iso: string, from: Date | null, to: Date | null, inclusiveTo = false) {
  const t = Date.parse(iso);
  if (from && t < from.getTime()) return false;
  if (to && (inclusiveTo ? t > to.getTime() : t >= to.getTime())) return false;
  return true;
}

const processed = new Set<string>(PROCESSED_STATUSES);
const flood = new Set<string>(FLOOD_TYPES);

export function createFixtureStore(): ReportStore {
  return {
    kind: "fixtures",
    reviewEnabled: true,

    async listReports(q: ResolvedListQuery) {
      const linked = new Set(db().incidents.map((i) => i.reportId));
      const admin = (r: BridgeReportRecord) => r.extraction?.administrative;
      const rows = db()
        .reports.filter((r) => {
          if (q.status === "all" && r.status === "ignored") return false;
          if (q.status === "confirmed" && !linked.has(r.id)) return false;
          if (q.status !== "all" && q.status !== "confirmed" && r.status !== q.status) return false;
          if (q.platform && r.platform !== q.platform) return false;
          if (q.reportType && r.reportType !== q.reportType) return false;
          if (q.group && r.source.groupName !== q.group) return false;
          if (q.region && admin(r)?.region.value !== q.region) return false;
          if (q.province && admin(r)?.province.value !== q.province) return false;
          if (q.municipality && admin(r)?.municipality.value !== q.municipality) return false;
          if (q.office && admin(r)?.districtEngineeringOffice.value !== q.office) return false;
          if (q.location && !JSON.stringify(r.extraction?.locations ?? []).toLowerCase().includes(q.location.toLowerCase()))
            return false;
          if (!inWindow(r.createdAt, q.from, q.to)) return false;
          if (q.idPrefix && !r.id.startsWith(q.idPrefix)) return false;
          const hay = haystack(r);
          return q.terms.every((t) => hay.includes(t.toLowerCase()));
        })
        .sort(byNewest);
      return { records: rows.slice(q.offset, q.offset + q.limit), total: rows.length };
    },

    async getReport(id) {
      return db().reports.find((r) => r.id === id) ?? null;
    },

    async listGroupWindow({ platform, groupName, from, to, limit }) {
      return db()
        .reports.filter(
          (r) =>
            r.platform === platform &&
            r.source.groupName === groupName &&
            processed.has(r.status) &&
            flood.has(r.reportType ?? "") &&
            inWindow(r.createdAt, from, to, true),
        )
        .sort(byNewest)
        .slice(0, limit);
    },

    async listFloodReports({ from, to, limit }) {
      return db()
        .reports.filter(
          (r) => processed.has(r.status) && flood.has(r.reportType ?? "") && inWindow(r.createdAt, from, to, true),
        )
        .sort(byNewest)
        .slice(0, limit);
    },

    async listLight({ from, limit }) {
      return db()
        .reports.filter((r) => inWindow(r.createdAt, from, null))
        .sort(byNewest)
        .slice(0, limit)
        .map(
          (r): LightRow => ({
            id: r.id,
            platform: r.platform,
            status: r.status,
            reportType: r.reportType,
            createdAt: r.createdAt,
            groupName: r.source.groupName,
            region: r.extraction?.administrative.region.value ?? null,
            province: r.extraction?.administrative.province.value ?? null,
            municipality: r.extraction?.administrative.municipality.value ?? null,
            office: r.extraction?.administrative.districtEngineeringOffice.value ?? null,
          }),
        );
    },

    async countSince(since) {
      return db().reports.filter((r) => r.status !== "ignored" && Date.parse(r.createdAt) > since.getTime()).length;
    },

    async processingLog(reportId) {
      const r = db().reports.find((x) => x.id === reportId);
      if (!r) return [];
      const entries = [{ id: `${r.id}-1`, at: r.createdAt, event: "received", detail: null }];
      if (r.extractionMeta?.extractedAt) {
        entries.push({ id: `${r.id}-2`, at: r.extractionMeta.extractedAt, event: "report_saved", detail: null });
      }
      for (const [i, h] of r.review.history.entries()) {
        entries.push({ id: `${r.id}-r${i}`, at: h.at, event: "reviewed", detail: null });
      }
      return entries;
    },

    async review(id, action, reviewer, notes) {
      const reports = db().reports;
      const i = reports.findIndex((r) => r.id === id);
      const r = reports[i];
      if (!r) throw new NotFoundError("Report not found");
      let status = r.status;
      if (action === "approve") {
        if (r.status !== "extracted" && r.status !== "needs_review") {
          throw new ConflictError(`cannot approve a report in status ${r.status}`);
        }
        status = "approved";
      } else if (action === "reject") {
        status = "rejected";
      } else {
        if (r.status !== "approved" && r.status !== "rejected") {
          throw new ConflictError("only approved or rejected reports can be reopened");
        }
        status = "needs_review";
      }
      const at = new Date().toISOString();
      reports[i] = {
        ...r,
        status,
        updatedAt: at,
        review: { ...r.review, history: [...r.review.history, { action, at, reviewer, notes }] },
      };
    },

    async incidentsForReports(reportIds) {
      const ids = new Set(reportIds);
      return db()
        .incidents.filter((i) => ids.has(i.reportId))
        .map(({ id, code, title, status, severity, reportId, createdAt }) => ({
          id,
          code,
          title,
          status,
          severity,
          reportId,
          createdAt,
        }));
    },

    async listIncidents({ offset, limit }) {
      const all = [...db().incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { items: all.slice(offset, offset + limit), total: all.length };
    },

    async getIncident(id) {
      return db().incidents.find((i) => i.id === id) ?? null;
    },

    async createIncident(reportId, input, createdBy) {
      const d = db();
      d.seq += 1;
      const now = new Date().toISOString();
      const incident: IncidentRecord = {
        id: randomUUID(),
        code: `INC-${manilaDayKey(now).replaceAll("-", "")}-${String(d.seq).padStart(6, "0")}`,
        reportId,
        ...input,
        status: "open",
        createdBy,
        createdAt: now,
        updatedAt: now,
      };
      d.incidents.push(incident);
      return incident;
    },

    async countIncidentsSince(from) {
      return db().incidents.filter((i) => !from || Date.parse(i.createdAt) >= from.getTime()).length;
    },
  };
}
