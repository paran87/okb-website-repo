import "server-only";
import { ApiError } from "@/lib/api/errors";
import type {
  BridgeReportRecord,
  CreateIncidentInput,
  IncidentRecord,
  IncidentSummary,
  ProcessingLogEntry,
  ReportStatusFilter,
  ReviewAction,
} from "@/features/reports/types";

/** List query after validation and date resolution (server-side). */
export interface ResolvedListQuery {
  terms: string[];
  idPrefix: string | null;
  platform: string | null;
  group: string | null;
  status: ReportStatusFilter;
  reportType: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  office: string | null;
  location: string | null;
  from: Date | null;
  to: Date | null;
  offset: number;
  limit: number;
}

/** Narrow projection used for counts, facets and analytics. */
export interface LightRow {
  id: string;
  platform: string | null;
  status: string;
  reportType: string | null;
  createdAt: string;
  groupName: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  office: string | null;
}

export interface ReportStore {
  kind: "supabase" | "fixtures";
  /** Whether review actions can be sent to the OKB Bridge backend. */
  reviewEnabled: boolean;
  listReports(q: ResolvedListQuery): Promise<{ records: BridgeReportRecord[]; total: number }>;
  getReport(id: string): Promise<BridgeReportRecord | null>;
  /** Reports from one platform/group in a time window (series candidates). */
  listGroupWindow(args: {
    platform: string | null;
    groupName: string | null;
    from: Date;
    to: Date;
    limit: number;
  }): Promise<BridgeReportRecord[]>;
  /** Processed flood reports in a window, newest first. */
  listFloodReports(args: { from: Date; to: Date; limit: number }): Promise<BridgeReportRecord[]>;
  /** Light rows, newest first. */
  listLight(args: { from: Date | null; limit: number }): Promise<LightRow[]>;
  countSince(since: Date): Promise<number>;
  processingLog(reportId: string): Promise<ProcessingLogEntry[]>;
  review(id: string, action: ReviewAction, reviewer: string, notes: string | null): Promise<void>;

  /** null = incident storage (migration) not set up. */
  incidentsForReports(reportIds: string[]): Promise<IncidentSummary[] | null>;
  listIncidents(args: { offset: number; limit: number }): Promise<{ items: IncidentRecord[]; total: number } | null>;
  getIncident(id: string): Promise<IncidentRecord | null>;
  createIncident(reportId: string, input: CreateIncidentInput, createdBy: string): Promise<IncidentRecord>;
  countIncidentsSince(from: Date | null): Promise<number | null>;
}

/** Backend unreachable / misconfigured. Message is safe to show operators. */
export class ReportsBackendError extends ApiError {
  constructor(message = "Unable to retrieve reports. Check backend connection.") {
    super(503, "INTERNAL_ERROR", message, { reason: "backend_unavailable" });
  }
}

export class IncidentStorageMissingError extends ApiError {
  constructor() {
    super(
      503,
      "INTERNAL_ERROR",
      "Incident storage is not set up. Apply supabase/migrations/20261005000000_okb_command_incidents.sql to the OKB Bridge Supabase project.",
      { reason: "incident_storage_missing" },
    );
  }
}

export const FLOOD_TYPES = [
  "flood_monitoring",
  "flood_prone_area_assessment",
  "non_flood_prone_area_assessment",
  "other_flood_report",
] as const;

/** Statuses whose extraction is complete (AI processed). */
export const PROCESSED_STATUSES = ["extracted", "needs_review", "approved", "rejected"] as const;
