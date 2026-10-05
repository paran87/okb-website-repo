import "server-only";
import type {
  BridgeReportRecord,
  ExtractedField,
  ExtractedLocation,
  ReportExtraction,
} from "@/features/reports/types";

/**
 * DEVELOPMENT FIXTURES — NOT OPERATIONAL DATA.
 *
 * Loaded only when NODE_ENV !== "production" AND OKB_REPORTS_DEV_FIXTURES=1.
 * Every API response then carries dataSource: "fixtures" and the UI shows a
 * persistent "development fixtures" banner. They mirror the record shape the
 * OKB Bridge backend writes, using the example NMDEO monitoring reports from
 * the Reports specification, so the comparison logic can be exercised.
 */

const missing: ExtractedField<never> = { value: null, status: "missing", raw: null };
const text = (raw: string): ExtractedField => ({ value: raw, status: "provided", raw, origin: "source" });
const height = (raw: string, meters: number): ExtractedField<number> => ({
  value: meters,
  status: "provided",
  raw,
  origin: "source",
  unit: "m",
});
const time = (raw: string, hhmm: string): ExtractedField => ({ value: hhmm, status: "provided", raw, origin: "source" });

interface LocSpec {
  name: string;
  height?: [string, number];
  /** Descriptive water level the backend could not normalize ("knee-deep"). */
  heightText?: string;
  road?: string;
  remarks?: string;
  intervention?: string;
  subsided?: [string, string];
  rainfall?: string;
}

function loc(spec: LocSpec, index: number): ExtractedLocation {
  return {
    index,
    rawLocationText: text(spec.name),
    roadName: missing,
    kilometerReference: missing,
    landmark: missing,
    barangay: missing,
    municipality: missing,
    province: missing,
    latitude: missing,
    longitude: missing,
    roadStatus: spec.road ? text(spec.road) : missing,
    remarks: spec.remarks ? text(spec.remarks) : missing,
    flood: {
      currentFloodHeight: spec.height
        ? height(spec.height[0], spec.height[1])
        : spec.heightText
          ? { value: null, status: "ambiguous", raw: spec.heightText, origin: "source", reason: "NOT_NUMERIC" }
          : missing,
      floodHeightBefore: missing,
      floodHeightAfter: missing,
      maximumFloodHeight: missing,
      maximumFloodHeightTime: missing,
      floodStartedAt: missing,
      floodSubsidedAt: spec.subsided ? time(spec.subsided[0], spec.subsided[1]) : missing,
    },
    rainfall: {
      rainfallStartedAt: missing,
      rainfallEndedAt: missing,
      rainfallIntensity: spec.rainfall ? text(spec.rainfall) : missing,
    },
    intervention: {
      interventionText: spec.intervention ? text(spec.intervention) : missing,
      interventionType: missing,
    },
  };
}

function extraction(title: string, admin: Partial<Record<"region" | "office" | "province" | "municipality", string>>, locs: LocSpec[]): ReportExtraction {
  return {
    reportTitle: text(title),
    remarks: missing,
    reporting: { reportDate: missing, reportTime: missing, inspectionDate: missing, inspectionTime: missing },
    administrative: {
      region: admin.region ? text(admin.region) : missing,
      districtEngineeringOffice: admin.office ? text(admin.office) : missing,
      province: admin.province ? text(admin.province) : missing,
      municipality: admin.municipality ? text(admin.municipality) : missing,
      barangay: missing,
    },
    preparedBy: { name: missing, position: missing, office: missing },
    locations: locs.map(loc),
  };
}

interface Spec {
  id: string;
  platform: "whatsapp" | "viber";
  group: string;
  sender: string;
  at: string;
  text: string;
  status: BridgeReportRecord["status"];
  type: BridgeReportRecord["reportType"];
  summary?: string;
  extraction?: ReportExtraction;
  warnings?: { code: string; message: string; field?: string }[];
  missingFields?: string[];
}

function record(s: Spec): BridgeReportRecord {
  const processed = s.status !== "received" && s.status !== "processing";
  return {
    id: s.id,
    messageId: `msg-${s.id.slice(0, 8)}`,
    platform: s.platform,
    deviceId: "OKB-ANDROID-DEV000",
    source: {
      platform: s.platform,
      platformBasis: "source_package",
      messageId: `msg-${s.id.slice(0, 8)}`,
      clientMessageId: null,
      fingerprint: s.id.replaceAll("-", ""),
      deviceId: "OKB-ANDROID-DEV000",
      groupId: null,
      groupName: s.group,
      senderId: null,
      senderName: s.sender,
      messageText: s.text,
      messageTimestamp: s.at,
      receivedAt: new Date(Date.parse(s.at) + 40_000).toISOString(),
      capturedAt: null,
      sourcePackage: s.platform === "viber" ? "com.viber.voip" : "com.whatsapp",
      mediaIndicator: { mediaType: "TEXT", mediaStatus: null },
    },
    status: s.status,
    reportType: s.type,
    classification: s.type ? { reportType: s.type, confidence: "high", basis: "ai", rationale: "Fixture" } : null,
    extraction: s.extraction ?? null,
    summary: s.summary ?? null,
    extractionMeta: processed
      ? {
          confidence: "high",
          missingFields: s.missingFields ?? [],
          ambiguousFields: [],
          notApplicableFields: [],
          warnings: s.warnings ?? [],
          model: "fixture",
          promptVersion: "flood-extract-v3",
          schemaVersion: 2,
          extractedAt: new Date(Date.parse(s.at) + 90_000).toISOString(),
        }
      : null,
    processing: { attempts: processed ? 1 : 0, lastAttemptAt: processed ? s.at : null, lastError: null },
    review: { linkedMessageIds: [], history: [] },
    createdAt: new Date(Date.parse(s.at) + 40_000).toISOString(),
    updatedAt: new Date(Date.parse(s.at) + 90_000).toISOString(),
  };
}

const PERSONNEL_DECLOG = "deployed flood monitoring personnel & declogging crew";
const PERSONNEL = "deployed flood monitoring personnel";
const PASSABLE = "passable to all types of vehicles";

const REPORT_1_TEXT = `NMDEO Flood Prone Areas as of October 4, 2026 11:45pm

1. Mel Lopez Blvd - No flooding

2. Tayuman cor. Abad Santos
0.20m
${PASSABLE}
${PERSONNEL_DECLOG}

3. Blumentritt cor. P. Margal - No flooding

4. CM Recto cor. Rizal Ave
0.10m
${PASSABLE}
${PERSONNEL}

5. España cor. Antipolo
0.15m
${PASSABLE}
${PERSONNEL_DECLOG}

6. España cor. M. Dela Fuente
0.10m
${PASSABLE}
${PERSONNEL_DECLOG}

7. R. Magsaysay cor. V. Mapa St
0.15m
${PASSABLE}
${PERSONNEL_DECLOG}

Weather condition:
Moderate Rainfall`;

const REPORT_2_TEXT = `NMDEO Flood Prone Areas as of October 5, 2026 02:07am

1. Mel Lopez Blvd - No flooding

2. Tayuman cor. Abad Santos
No flooding
subsided as of 01:34 AM

3. Blumentritt cor. P. Margal
No flooding

4. CM Recto cor. Rizal Ave
No flooding
subsided as of 12:50 AM

5. España cor. Antipolo
No flooding
subsided as of 12:53 AM

6. España cor. M. Dela Fuente
No flooding
subsided as of 01:54 AM

7. R. Magsaysay cor. V. Mapa St
No flooding
subsided as of 12:59 AM

Weather condition:
Cloudy`;

const NMDEO = { region: "NCR", office: "NMDEO" };

export function buildDevFixtures(): BridgeReportRecord[] {
  return [
    record({
      id: "0f6a1c2e-4b1d-4c8e-9a51-2d7e9b1f0a01",
      platform: "whatsapp",
      group: "NCR 24/7 Quick Response Team",
      sender: "Roxanne F",
      at: "2026-10-04T15:45:00.000Z",
      text: REPORT_1_TEXT,
      status: "approved",
      type: "flood_monitoring",
      summary:
        "NMDEO reports flooding of 0.10–0.20 m at five of seven monitored locations, all passable to all types of vehicles, with flood monitoring personnel and declogging crews deployed. Weather: moderate rainfall.",
      extraction: extraction("NMDEO Flood Prone Areas as of October 4, 2026 11:45pm", NMDEO, [
        { name: "Mel Lopez Blvd", remarks: "No flooding" },
        { name: "Tayuman cor. Abad Santos", height: ["0.20m", 0.2], road: PASSABLE, intervention: PERSONNEL_DECLOG },
        { name: "Blumentritt cor. P. Margal", remarks: "No flooding" },
        { name: "CM Recto cor. Rizal Ave", height: ["0.10m", 0.1], road: PASSABLE, intervention: PERSONNEL },
        { name: "España cor. Antipolo", height: ["0.15m", 0.15], road: PASSABLE, intervention: PERSONNEL_DECLOG },
        { name: "España cor. M. Dela Fuente", height: ["0.10m", 0.1], road: PASSABLE, intervention: PERSONNEL_DECLOG },
        { name: "R. Magsaysay cor. V. Mapa St", height: ["0.15m", 0.15], road: PASSABLE, intervention: PERSONNEL_DECLOG },
      ]),
    }),
    record({
      id: "5c2d8e7a-91f3-4a60-b7c4-8e1f2a3b4c02",
      platform: "whatsapp",
      group: "NCR 24/7 Quick Response Team",
      sender: "Roxanne F",
      at: "2026-10-04T18:07:00.000Z",
      text: REPORT_2_TEXT,
      status: "extracted",
      type: "flood_monitoring",
      summary:
        "All seven monitored NMDEO locations currently report no flooding. Flooding at five locations subsided between 12:50 AM and 01:54 AM. Weather: cloudy.",
      extraction: extraction("NMDEO Flood Prone Areas as of October 5, 2026 02:07am", NMDEO, [
        { name: "Mel Lopez Blvd", remarks: "No flooding" },
        { name: "Tayuman cor. Abad Santos", remarks: "No flooding", subsided: ["subsided as of 01:34 AM", "01:34"] },
        { name: "Blumentritt cor. P. Margal", remarks: "No flooding" },
        { name: "CM Recto cor. Rizal Ave", remarks: "No flooding", subsided: ["subsided as of 12:50 AM", "00:50"] },
        { name: "España cor. Antipolo", remarks: "No flooding", subsided: ["subsided as of 12:53 AM", "00:53"] },
        { name: "España cor. M. Dela Fuente", remarks: "No flooding", subsided: ["subsided as of 01:54 AM", "01:54"] },
        { name: "R. Magsaysay cor. V. Mapa St", remarks: "No flooding", subsided: ["subsided as of 12:59 AM", "00:59"] },
      ]),
    }),
    record({
      id: "9b7e3f10-2c4d-4e5f-8a6b-7c8d9e0f1a03",
      platform: "viber",
      group: "Flood Monitoring IV-A",
      sender: "Engr. M. Santos",
      at: "2026-10-04T21:20:00.000Z",
      text: `Flood update - Santa Rosa
Brgy. Balibago, along National Highway near the public market
Flood depth: knee-deep
Not passable to light vehicles
Rainfall: heavy
Action: deployed traffic enforcers and warning signs`,
      status: "needs_review",
      type: "flood_monitoring",
      summary:
        "Knee-deep flooding reported along the National Highway near the Balibago public market in Santa Rosa; not passable to light vehicles. Heavy rainfall. Traffic enforcers and warning signs deployed.",
      warnings: [
        { code: "NOT_NUMERIC", field: "locations[0].flood.currentFloodHeight", message: "Value is descriptive, not a measurement." },
      ],
      missingFields: ["reporting.reportDate", "reporting.reportTime", "administrative.province", "administrative.region"],
      extraction: extraction("Flood update - Santa Rosa", { municipality: "Santa Rosa" }, [
        {
          name: "Brgy. Balibago, along National Highway near the public market",
          heightText: "knee-deep",
          road: "Not passable to light vehicles",
          rainfall: "heavy",
          intervention: "deployed traffic enforcers and warning signs",
        },
      ]),
    }),
    record({
      id: "c4d5e6f7-0a1b-4c2d-9e3f-4a5b6c7d8e04",
      platform: "viber",
      group: "Flood Monitoring IV-A",
      sender: "Engr. M. Santos",
      at: "2026-10-05T01:05:00.000Z",
      text: "Good morning po. Copy, will send the 9AM update after field inspection.",
      status: "ignored",
      type: "not_flood_report",
      summary: "The message is not a flood report; it acknowledges a request and says an update will follow.",
    }),
    record({
      id: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a05",
      platform: "whatsapp",
      group: "NCR 24/7 Quick Response Team",
      sender: "J. Dela Cruz",
      at: "2026-10-05T02:12:00.000Z",
      text: "SDEO update: Taft Ave cor. Pedro Gil — water level 0.30m, passable to large vehicles only. Declogging ongoing.",
      status: "received",
      type: null,
    }),
  ];
}

export const DEV_FIXTURE_NOTE =
  "Development fixtures (NMDEO example from the Reports specification). Not operational data.";
