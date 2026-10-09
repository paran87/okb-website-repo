/**
 * Reports feature — domain types.
 *
 * Two layers:
 *
 * 1. `Bridge*` types mirror what the OKB Bridge backend (okb-bridge-cloud-backend)
 *    stores in Supabase: one `okb_bridge_reports` row per WhatsApp/Viber message,
 *    with the full report in the `record` JSONB column. The original message is
 *    the immutable `record.source` snapshot; AI output lives beside it in
 *    `record.extraction` / `record.summary` and never replaces it.
 * 2. DTOs (`ReportListItem`, `ReportDetail`, …) are what the Command Center API
 *    sends to the browser. They are human-readable views; raw JSON never reaches
 *    the primary UI.
 */

// ---------------------------------------------------------------------------
// OKB Bridge record (backend-owned; read-only from the Command Center)
// ---------------------------------------------------------------------------

/** Messaging platforms the bridge captures. New platforms appear as new ids. */
export type ReportPlatform = "whatsapp" | "viber" | (string & {});

/** Processing / review states written by the bridge backend. */
export type BridgeReportStatus =
  | "received"
  | "processing"
  | "extracted"
  | "needs_review"
  | "approved"
  | "rejected"
  | "ignored"
  | "failed";

/** Report types the bridge's AI classifier can assign. */
export type BridgeReportType =
  | "flood_monitoring"
  | "flood_prone_area_assessment"
  | "non_flood_prone_area_assessment"
  | "other_flood_report"
  | "not_flood_report";

export type FieldStatus = "provided" | "missing" | "not_applicable" | "ambiguous";

/**
 * One extracted value. `raw` is the verbatim source text; `value` is the
 * deterministic normalization (meters, HH:mm, YYYY-MM-DD…) or null when the
 * source did not state it or it could not be interpreted.
 */
export interface ExtractedField<T = string> {
  value: T | null;
  status: FieldStatus;
  raw: string | null;
  origin?: "source" | "system_derived";
  reason?: string;
  unit?: string | null;
  approximate?: boolean;
  /** Date stated alongside a time value, if any. */
  date?: string;
}

export interface ExtractedLocation {
  index: number;
  rawLocationText: ExtractedField;
  roadName: ExtractedField;
  kilometerReference: ExtractedField;
  landmark: ExtractedField;
  barangay: ExtractedField;
  municipality: ExtractedField;
  province: ExtractedField;
  latitude: ExtractedField<number>;
  longitude: ExtractedField<number>;
  roadStatus: ExtractedField;
  remarks: ExtractedField;
  flood: {
    currentFloodHeight: ExtractedField<number>;
    floodHeightBefore: ExtractedField<number>;
    floodHeightAfter: ExtractedField<number>;
    maximumFloodHeight: ExtractedField<number>;
    maximumFloodHeightTime: ExtractedField;
    floodStartedAt: ExtractedField;
    floodSubsidedAt: ExtractedField;
  };
  rainfall: {
    rainfallStartedAt: ExtractedField;
    rainfallEndedAt: ExtractedField;
    rainfallIntensity: ExtractedField;
  };
  intervention: {
    interventionText: ExtractedField;
    /** System-derived (keyword match), never source-provided. */
    interventionType: ExtractedField<string[]>;
  };
}

export interface ReportExtraction {
  reportTitle: ExtractedField;
  remarks: ExtractedField;
  reporting: {
    reportDate: ExtractedField;
    reportTime: ExtractedField;
    inspectionDate: ExtractedField;
    inspectionTime: ExtractedField;
  };
  administrative: {
    region: ExtractedField;
    districtEngineeringOffice: ExtractedField;
    province: ExtractedField;
    municipality: ExtractedField;
    barangay: ExtractedField;
  };
  preparedBy: {
    name: ExtractedField;
    position: ExtractedField;
    office: ExtractedField;
  };
  locations: ExtractedLocation[];
}

/** Immutable snapshot of the original WhatsApp/Viber message. */
export interface BridgeSourceMessage {
  platform: ReportPlatform | null;
  platformBasis: string | null;
  messageId: string | null;
  clientMessageId: string | null;
  fingerprint: string | null;
  deviceId: string | null;
  groupId: string | null;
  groupName: string | null;
  senderId: string | null;
  senderName: string | null;
  messageText: string | null;
  /** Message time as reported by the messaging app. */
  messageTimestamp: string | null;
  /** When the OKB Bridge backend received the upload. */
  receivedAt: string | null;
  capturedAt: string | null;
  sourcePackage: string | null;
  mediaIndicator: { mediaType: string | null; mediaStatus: string | null } | null;
}

export interface ExtractionWarning {
  code: string;
  field?: string;
  message: string;
}

export interface ReviewHistoryEntry {
  action: string;
  at: string;
  reviewer: string | null;
  notes: string | null;
}

export interface BridgeReportRecord {
  id: string;
  messageId: string;
  platform: ReportPlatform | null;
  deviceId: string | null;
  source: BridgeSourceMessage;
  status: BridgeReportStatus;
  reportType: BridgeReportType | null;
  classification: {
    reportType: string | null;
    confidence: string | null;
    basis?: string | null;
    rationale?: string | null;
  } | null;
  extraction: ReportExtraction | null;
  summary: string | null;
  extractionMeta: {
    confidence?: string | null;
    missingFields: string[];
    ambiguousFields: string[];
    notApplicableFields: string[];
    warnings: ExtractionWarning[];
    model?: string | null;
    promptVersion?: string | null;
    schemaVersion?: number | null;
    extractedAt?: string | null;
  } | null;
  processing: {
    attempts: number;
    lastAttemptAt: string | null;
    lastError: { code: string; message: string } | null;
  };
  review: {
    linkedMessageIds: string[];
    history: ReviewHistoryEntry[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingLogEntry {
  id: string;
  at: string;
  event: string;
  detail: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Derived (system-computed) observations
// ---------------------------------------------------------------------------

/**
 * Flood condition of one monitored location, derived deterministically from
 * the AI-extracted fields. "No flooding" is its own state and is NEVER turned
 * into a measured 0.00 m water level.
 */
export type FloodCondition =
  | "flooded"
  | "flooding_reported_unmeasured"
  | "no_flooding"
  | "subsided"
  | "unknown";

export interface LocationObservation {
  index: number;
  /** Normalized key used to match the same location across reports. */
  key: string | null;
  label: string;
  condition: FloodCondition;
  /** Why the condition was assigned (measurement or quoted source wording). */
  conditionBasis: string | null;
  heightM: number | null;
  heightRaw: string | null;
  heightApproximate: boolean;
  /** HH:mm as stated in the report; no date is assumed. */
  subsidedAt: string | null;
  roadStatus: string | null;
  intervention: string | null;
  rainfall: string | null;
  remarks: string | null;
}

export interface WeatherObservation {
  text: string;
  /** "source_text": the "Weather condition:" line of the original message. */
  origin: "source_text" | "extracted_rainfall";
}

// ---------------------------------------------------------------------------
// Monitoring series & comparison
// ---------------------------------------------------------------------------

export type LocationChangeKind =
  | "newly_flooded"
  | "subsided"
  | "level_increased"
  | "level_decreased"
  | "still_flooded"
  | "unchanged_flooded"
  | "unchanged_clear"
  | "new_location"
  | "no_longer_listed"
  | "not_comparable";

export interface ValueChange {
  from: string;
  to: string;
}

export interface LocationChange {
  key: string;
  label: string;
  kind: LocationChangeKind;
  detail: string;
  previous: LocationObservation | null;
  current: LocationObservation | null;
  deltaM: number | null;
  roadChange: ValueChange | null;
  interventionChange: ValueChange | null;
}

export interface FloodMetrics {
  monitored: number;
  flooded: number;
  noFlooding: number;
  subsided: number;
  unknown: number;
}

export interface SeriesMemberRef {
  id: string;
  reference: string;
  messageTime: string | null;
  isCurrent: boolean;
}

export interface SeriesComparison {
  seriesKey: string;
  seriesLabel: string;
  /** Evidence that links the reports — shown to the operator. */
  evidence: string[];
  members: SeriesMemberRef[];
  current: { id: string; reference: string; messageTime: string | null; metrics: FloodMetrics };
  previous: {
    id: string;
    reference: string;
    messageTime: string | null;
    metrics: FloodMetrics;
  } | null;
  changes: LocationChange[];
  weather: {
    previous: WeatherObservation | null;
    current: WeatherObservation | null;
    /** null when either side was not reported. */
    changed: boolean | null;
  };
  /** Deterministic sentence built from the metrics above (not AI). */
  computedSummary: string;
}

export interface LocationHistoryEntry {
  reportId: string;
  reference: string;
  messageTime: string | null;
  observation: LocationObservation;
}

export interface LocationHistory {
  key: string;
  label: string;
  seriesLabel: string | null;
  entries: LocationHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Incidents linked to reports
// ---------------------------------------------------------------------------

export type IncidentSeverity = "low" | "moderate" | "high" | "critical";
export type IncidentStatus = "open" | "monitoring" | "resolved" | "closed";

export interface IncidentSummary {
  id: string;
  code: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  reportId: string;
  createdAt: string;
}

export interface IncidentRecord extends IncidentSummary {
  incidentType: string;
  sourceLocationIndex: number | null;
  locationText: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  description: string | null;
  createdBy: string;
  updatedAt: string;
}

export interface CreateIncidentInput {
  title: string;
  incidentType: string;
  severity: IncidentSeverity;
  sourceLocationIndex: number | null;
  locationText: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  description: string | null;
}

/** "ready": incidents table exists. "not_configured": migration not applied. */
export type IncidentStorageState = "ready" | "not_configured";

// ---------------------------------------------------------------------------
// API DTOs
// ---------------------------------------------------------------------------

export type ReportDataSource = "supabase" | "fixtures" | "not_configured";

export type DatePreset = "today" | "yesterday" | "7d" | "30d" | "all" | "custom" | "period";

/** UI status filter values (backend statuses plus "confirmed" = has incident). */
export type ReportStatusFilter = BridgeReportStatus | "confirmed" | "all";

export interface ReportListQuery {
  q?: string;
  platform?: string;
  group?: string;
  status?: ReportStatusFilter;
  reportType?: string;
  region?: string;
  province?: string;
  municipality?: string;
  office?: string;
  location?: string;
  datePreset?: DatePreset;
  /** YYYY-MM-DD (Asia/Manila) — used with datePreset "custom". */
  from?: string;
  to?: string;
  /** Monitoring day YYYY-MM-DD and one of its four periods — used with datePreset "period". */
  day?: string;
  period?: "am" | "pm" | "eve" | "night";
  page?: number;
  pageSize?: number;
}

export interface ReportListItem {
  id: string;
  reference: string;
  platform: ReportPlatform | null;
  groupName: string | null;
  senderName: string | null;
  messageTime: string | null;
  receivedAt: string;
  status: BridgeReportStatus;
  reportType: BridgeReportType | null;
  preview: string;
  /** Whole message text (line breaks kept), for the expandable card. */
  message: string;
  aiSummary: string | null;
  title: string | null;
  office: string | null;
  region: string | null;
  locationCount: number;
  floodedCount: number;
  clearCount: number;
  warningCount: number;
  incidents: IncidentSummary[];
}

export interface ReportListResult {
  items: ReportListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  incidentStorage: IncidentStorageState;
}

export interface ReportDetail {
  id: string;
  reference: string;
  messageId: string;
  source: BridgeSourceMessage;
  status: BridgeReportStatus;
  reportType: BridgeReportType | null;
  classification: BridgeReportRecord["classification"];
  aiSummary: string | null;
  extraction: ReportExtraction | null;
  extractionMeta: BridgeReportRecord["extractionMeta"];
  processing: BridgeReportRecord["processing"];
  reviewHistory: ReviewHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  observations: LocationObservation[];
  weather: WeatherObservation | null;
  series: SeriesComparison | null;
  /** Why the report was not linked to a series (when it was not). */
  seriesNote: string | null;
  incidents: IncidentSummary[];
  incidentStorage: IncidentStorageState;
  processingLog: ProcessingLogEntry[];
  actions: {
    canMarkReviewed: boolean;
    canReject: boolean;
    canReopen: boolean;
    canCreateIncident: boolean;
    reviewUnavailableReason: string | null;
  };
}

export type ReviewAction = "approve" | "reject" | "reopen";

export interface CountBucket {
  key: string;
  label: string;
  count: number;
}

export interface SituationSummary {
  /** hours: 0 when the window is a monitoring period ([period] then names it). */
  window: { hours: number; from: string; to: string; day?: string; period?: string };
  totals: {
    reports: number;
    aiProcessed: number;
    pendingReview: number;
    reviewed: number;
    failed: number;
    confirmedIncidents: number | null;
  };
  bySource: CountBucket[];
  byGroup: CountBucket[];
  byRegion: CountBucket[];
  byReportType: CountBucket[];
  series: SeriesComparison[];
  /** Latest AI summaries per report (AI-generated, not verified). */
  latestAiSummaries: {
    id: string;
    reference: string;
    groupName: string | null;
    messageTime: string | null;
    summary: string;
  }[];
  /** Cross-report AI narrative — only when the backend produces one. */
  aiSituation: { text: string; generatedAt: string } | null;
  truncated: boolean;
}

export interface ReportAnalytics {
  generatedAt: string;
  window: { days: number; from: string };
  received: { today: number; week: number; month: number };
  bySource: CountBucket[];
  byGroup: CountBucket[];
  byRegion: CountBucket[];
  byReportType: CountBucket[];
  byStatus: CountBucket[];
  rates: {
    aiProcessed: number | null;
    reviewed: number | null;
    confirmedIncidents: number | null;
  };
  daily: { day: string; reports: number }[];
  floodDaily: { day: string; flooded: number; clear: number; unknown: number }[];
  floodSampleSize: number;
  truncated: boolean;
}

export interface ReportFacets {
  groups: { name: string; platform: string | null }[];
  regions: string[];
  provinces: string[];
  municipalities: string[];
  offices: string[];
}

/** Where operator access is checked; see features/reports/server/access.ts. */
export type AccessArea = "reports" | "settings" | "operations";

export interface ReportsAccessState {
  dataSource: ReportDataSource;
  /** Operator access key configured on the server. */
  accessConfigured: boolean;
  granted: boolean;
  operatorName: string | null;
  /** Bridge review API configured (Mark Reviewed / Reject / Reopen). */
  reviewEnabled: boolean;
  /** No access key is asked in this area (the report pages): its data is open to anyone with the link. */
  accessGateDisabled: boolean;
}
