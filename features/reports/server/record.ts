import "server-only";
import type {
  BridgeReportRecord,
  BridgeReportStatus,
  BridgeReportType,
  BridgeSourceMessage,
  ExtractedField,
  ExtractedLocation,
  ReportExtraction,
} from "@/features/reports/types";

/**
 * Defensive reader for `okb_bridge_reports.record`. The JSONB is written by
 * another service (and by older backend versions), so every field is checked
 * and anything malformed becomes "missing" — never a guessed value.
 */

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const FIELD_STATUSES = new Set(["provided", "missing", "not_applicable", "ambiguous"]);
const STATUSES = new Set<BridgeReportStatus>([
  "received",
  "processing",
  "extracted",
  "needs_review",
  "approved",
  "rejected",
  "ignored",
  "failed",
]);
const TYPES = new Set<BridgeReportType>([
  "flood_monitoring",
  "flood_prone_area_assessment",
  "non_flood_prone_area_assessment",
  "other_flood_report",
  "not_flood_report",
]);

const MISSING: ExtractedField<never> = { value: null, status: "missing", raw: null };

function textField(v: unknown): ExtractedField {
  const o = obj(v);
  const status = FIELD_STATUSES.has(o.status as string) ? (o.status as ExtractedField["status"]) : null;
  if (!status) return MISSING;
  return {
    value: str(o.value),
    status,
    raw: str(o.raw),
    origin: o.origin === "system_derived" ? "system_derived" : "source",
    ...(str(o.reason) ? { reason: str(o.reason) as string } : {}),
    ...(str(o.date) ? { date: str(o.date) as string } : {}),
    ...(o.approximate === true ? { approximate: true } : {}),
  };
}

function numberField(v: unknown): ExtractedField<number> {
  const o = obj(v);
  const status = FIELD_STATUSES.has(o.status as string) ? (o.status as ExtractedField["status"]) : null;
  if (!status) return MISSING;
  return {
    value: num(o.value),
    status: status === "provided" && num(o.value) === null ? "ambiguous" : status,
    raw: str(o.raw),
    origin: "source",
    unit: str(o.unit),
    ...(str(o.reason) ? { reason: str(o.reason) as string } : {}),
    ...(o.approximate === true ? { approximate: true } : {}),
  };
}

function listField(v: unknown): ExtractedField<string[]> {
  const o = obj(v);
  const status = FIELD_STATUSES.has(o.status as string) ? (o.status as ExtractedField["status"]) : null;
  if (!status) return { ...MISSING, origin: "system_derived" };
  const value = Array.isArray(o.value) ? o.value.filter((x): x is string => typeof x === "string") : null;
  return { value, status, raw: null, origin: "system_derived" };
}

function location(v: unknown, i: number): ExtractedLocation {
  const o = obj(v);
  const flood = obj(o.flood);
  const rainfall = obj(o.rainfall);
  const intervention = obj(o.intervention);
  return {
    index: num(o.index) ?? i,
    rawLocationText: textField(o.rawLocationText),
    roadName: textField(o.roadName),
    kilometerReference: textField(o.kilometerReference),
    landmark: textField(o.landmark),
    barangay: textField(o.barangay),
    municipality: textField(o.municipality),
    province: textField(o.province),
    latitude: numberField(o.latitude),
    longitude: numberField(o.longitude),
    roadStatus: textField(o.roadStatus),
    remarks: textField(o.remarks),
    flood: {
      currentFloodHeight: numberField(flood.currentFloodHeight),
      floodHeightBefore: numberField(flood.floodHeightBefore),
      floodHeightAfter: numberField(flood.floodHeightAfter),
      maximumFloodHeight: numberField(flood.maximumFloodHeight),
      maximumFloodHeightTime: textField(flood.maximumFloodHeightTime),
      floodStartedAt: textField(flood.floodStartedAt),
      floodSubsidedAt: textField(flood.floodSubsidedAt),
    },
    rainfall: {
      rainfallStartedAt: textField(rainfall.rainfallStartedAt),
      rainfallEndedAt: textField(rainfall.rainfallEndedAt),
      rainfallIntensity: textField(rainfall.rainfallIntensity),
    },
    intervention: {
      interventionText: textField(intervention.interventionText),
      interventionType: listField(intervention.interventionType),
    },
  };
}

function extraction(v: unknown): ReportExtraction | null {
  if (!v || typeof v !== "object") return null;
  const o = obj(v);
  const reporting = obj(o.reporting);
  const admin = obj(o.administrative);
  const prepared = obj(o.preparedBy);
  return {
    reportTitle: textField(o.reportTitle),
    remarks: textField(o.remarks),
    reporting: {
      reportDate: textField(reporting.reportDate),
      reportTime: textField(reporting.reportTime),
      inspectionDate: textField(reporting.inspectionDate),
      inspectionTime: textField(reporting.inspectionTime),
    },
    administrative: {
      region: textField(admin.region),
      districtEngineeringOffice: textField(admin.districtEngineeringOffice),
      province: textField(admin.province),
      municipality: textField(admin.municipality),
      barangay: textField(admin.barangay),
    },
    preparedBy: {
      name: textField(prepared.name),
      position: textField(prepared.position),
      office: textField(prepared.office),
    },
    locations: Array.isArray(o.locations) ? o.locations.map(location) : [],
  };
}

function source(v: unknown, platform: string | null): BridgeSourceMessage {
  const o = obj(v);
  const media = obj(o.mediaIndicator);
  return {
    platform: str(o.platform) ?? platform,
    platformBasis: str(o.platformBasis),
    messageId: str(o.messageId),
    clientMessageId: str(o.clientMessageId),
    fingerprint: str(o.fingerprint),
    deviceId: str(o.deviceId),
    groupId: str(o.groupId),
    groupName: str(o.groupName),
    senderId: str(o.senderId),
    senderName: str(o.senderName),
    messageText: str(o.messageText),
    messageTimestamp: str(o.messageTimestamp),
    receivedAt: str(o.receivedAt),
    capturedAt: str(o.capturedAt),
    sourcePackage: str(o.sourcePackage),
    mediaIndicator: o.mediaIndicator ? { mediaType: str(media.mediaType), mediaStatus: str(media.mediaStatus) } : null,
  };
}

/** Row columns override the JSON where both exist (the backend writes them together). */
export interface ReportRow {
  id: string;
  status?: string | null;
  report_type?: string | null;
  platform?: string | null;
  ai_summary?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  record: unknown;
}

export function parseRecord(row: ReportRow): BridgeReportRecord {
  const r = obj(row.record);
  const platform = row.platform ?? str(r.platform);
  const status = (row.status ?? str(r.status)) as BridgeReportStatus;
  const type = (row.report_type ?? str(r.reportType)) as BridgeReportType;
  const meta = r.extractionMeta ? obj(r.extractionMeta) : null;
  const processing = obj(r.processing);
  const review = obj(r.review);
  const classification = r.classification ? obj(r.classification) : null;
  const lastError = processing.lastError ? obj(processing.lastError) : null;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

  return {
    id: row.id,
    messageId: str(r.messageId) ?? "",
    platform,
    deviceId: str(r.deviceId),
    source: source(r.source, platform),
    status: STATUSES.has(status) ? status : "received",
    reportType: TYPES.has(type) ? type : null,
    classification: classification
      ? {
          reportType: str(classification.reportType),
          confidence: str(classification.confidence),
          basis: str(classification.basis),
          rationale: str(classification.rationale),
        }
      : null,
    extraction: extraction(r.extraction),
    summary: row.ai_summary ?? str(r.summary),
    extractionMeta: meta
      ? {
          confidence: str(meta.confidence),
          missingFields: strings(meta.missingFields),
          ambiguousFields: strings(meta.ambiguousFields),
          notApplicableFields: strings(meta.notApplicableFields),
          warnings: Array.isArray(meta.warnings)
            ? meta.warnings.map((w) => {
                const o = obj(w);
                return { code: str(o.code) ?? "WARNING", message: str(o.message) ?? "", ...(str(o.field) ? { field: str(o.field) as string } : {}) };
              })
            : [],
          model: str(meta.servedModel) ?? str(meta.model),
          promptVersion: str(meta.promptVersion),
          schemaVersion: num(meta.schemaVersion),
          extractedAt: str(meta.extractedAt),
        }
      : null,
    processing: {
      attempts: num(processing.attempts) ?? 0,
      lastAttemptAt: str(processing.lastAttemptAt),
      lastError: lastError ? { code: str(lastError.code) ?? "error", message: str(lastError.message) ?? "" } : null,
    },
    review: {
      linkedMessageIds: strings(review.linkedMessageIds),
      history: Array.isArray(review.history)
        ? review.history.map((h) => {
            const o = obj(h);
            return { action: str(o.action) ?? "", at: str(o.at) ?? "", reviewer: str(o.reviewer), notes: str(o.notes) };
          })
        : [],
    },
    createdAt: row.created_at ?? str(r.createdAt) ?? new Date(0).toISOString(),
    updatedAt: row.updated_at ?? str(r.updatedAt) ?? row.created_at ?? new Date(0).toISOString(),
  };
}
