import "server-only";
import { floodSeverity } from "@/features/incident/lib/flood-severity";
import { reportReference } from "@/features/reports/lib/format";
import { reportPhotoUrl } from "@/features/reports/server/record";
import { MOBILE_REPORT_PLATFORM, type BridgeReportStatus } from "@/features/reports/types";
import { expiryReason, mobileExpiryHours } from "@/features/flood-report/lib/expiry";
import { floodLevel, formatDepth, roadStatus, weather } from "@/features/flood-report/lib/options";
import type { FloodReportFormValues, FloodReportInput, MyFloodReport, PlaceName, PublicFloodReport } from "@/features/flood-report/types";

/**
 * Turns a mobile flood report into an `okb_bridge_reports` record in the same shape the OKB Bridge writes
 * for WhatsApp/Viber messages (features/reports/server/record.ts reads both), so it appears in Incoming
 * Reports, on the Incidents flood map and in the analytics without special cases.
 *
 * Every field comes straight from the form (status "provided"), never from AI. The form's own values are
 * also kept under `record.mobile` for the public map and the photo gallery.
 *
 * `extractionMeta.extractedAt` stays null on purpose: the bridge's automatic consolidated WhatsApp report
 * only includes reports with an extraction time, so unverified public reports never reach it.
 */

export const MOBILE_GROUP_NAME = "OKB Mobile Flood Reports";

const MANILA = "Asia/Manila";

function manilaParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** "Oct 19, 2:30 PM" in Philippine time. */
export function manilaLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Field<T = string> = {
  value: T | null;
  status: "provided" | "missing";
  raw: string | null;
  origin: "source";
  unit?: string | null;
  approximate?: boolean;
  date?: string;
};

function field<T = string>(value: T | null | undefined, raw?: string | null, extra: Partial<Field<T>> = {}): Field<T> {
  if (value === null || value === undefined || value === "") return { value: null, status: "missing", raw: null, origin: "source" };
  return { value, status: "provided", raw: raw ?? String(value), origin: "source", ...extra };
}

/** Depth in meters: the measured depth when given, else the MMDA gauge level. */
export function depthOf(input: Pick<FloodReportInput, "level" | "depthCm">): number | null {
  if (input.depthCm !== null && input.depthCm > 0) return Math.round(input.depthCm) / 100;
  return floodLevel(input.level)?.meters ?? null;
}

function depthText(input: FloodReportInput): string {
  const level = floodLevel(input.level);
  const depth = depthOf(input);
  // No brackets: the consolidated WhatsApp report puts this wording inside its own "Flooding (…)".
  if (input.depthCm !== null && input.depthCm > 0) return `${depth !== null ? formatDepth(depth) : ""}${level ? `, ${level.label.toLowerCase()}` : ""}`;
  return level ? `${level.label}, about ${formatDepth(level.meters)} / ${level.inches}` : "Not stated";
}

export function buildMobileRecord(input: FloodReportInput, now: Date = new Date()) {
  const at = now.toISOString();
  const level = floodLevel(input.level);
  const depth = depthOf(input);
  const road = roadStatus(input.roadStatus);
  const sky = weather(input.weather);
  const receded = input.recededAt !== null;
  const started = manilaParts(input.startedAt);
  const recededParts = input.recededAt ? manilaParts(input.recededAt) : null;
  const sent = manilaParts(at);
  const place = input.place;
  const area = [place?.barangay, place?.city].filter(Boolean).join(", ") || null;
  const location = [input.locationText, area && !input.locationText.includes(area) ? area : null].filter(Boolean).join(", ");
  const coords = `${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`;
  const rainy = input.weather !== "clear" && input.weather !== "cloudy";
  const photoCount = input.photos.length;

  // Laid out like the DEO field reports, so the "Weather condition:" line is read the same way.
  const messageText = [
    "COMMUNITY FLOOD REPORT (OKB Mobile)",
    `Location: ${location}`,
    input.landmark ? `Landmark: ${input.landmark}` : null,
    `Coordinates: ${coords}${input.accuracyM !== null ? ` (±${Math.round(input.accuracyM)} m)` : ""}`,
    `Flood height: ${depthText(input)}`,
    `Road status: ${road?.label ?? "Not stated"}`,
    `Weather condition: ${sky?.label ?? "Not stated"}`,
    `Flood started: ${manilaLabel(input.startedAt)}`,
    `Flood receded: ${input.recededAt ? manilaLabel(input.recededAt) : "Not yet (still flooded)"}`,
    input.remarks ? `Remarks: ${input.remarks}` : null,
    `Reported by: ${input.senderName ?? "Anonymous"}`,
    `Photos: ${photoCount} geotagged`,
  ]
    .filter(Boolean)
    .join("\n");

  const summary = [
    receded
      ? `Flooding of ${depth !== null ? `about ${formatDepth(depth)}` : "unstated depth"} at ${location} has receded (${manilaLabel(input.recededAt as string)}).`
      : `${level ? level.label : "Flooding"}${depth !== null ? ` (about ${formatDepth(depth)})` : ""} reported at ${location}.`,
    road ? `${road.label}.` : null,
    sky ? `Weather: ${sky.label.toLowerCase()}.` : null,
    `Started ${manilaLabel(input.startedAt)}.`,
    `${photoCount} geotagged photo${photoCount === 1 ? "" : "s"} from a member of the public; not yet verified.`,
  ]
    .filter(Boolean)
    .join(" ");

  const depthRaw = depthText(input);
  const locationFields = {
    index: 0,
    rawLocationText: field(location),
    roadName: field(place?.road ?? null),
    kilometerReference: field(null),
    landmark: field(input.landmark),
    barangay: field(place?.barangay ?? null),
    municipality: field(place?.city ?? null),
    province: field(place?.province ?? null),
    latitude: field(input.latitude, input.latitude.toFixed(6), { unit: "deg" }),
    longitude: field(input.longitude, input.longitude.toFixed(6), { unit: "deg" }),
    roadStatus: field(road?.label ?? null),
    remarks: field(input.remarks),
    flood: {
      // A receded flood is "0 now" (shown as subsided, never as a 0.00 m flood); its depth stays the maximum.
      currentFloodHeight: receded
        ? field(0, `0 (receded ${manilaLabel(input.recededAt as string)})`, { unit: "m" })
        : field(depth, depthRaw, { unit: "m", approximate: !(input.depthCm && input.depthCm > 0) }),
      floodHeightBefore: field(null),
      floodHeightAfter: field(null),
      maximumFloodHeight: receded ? field(depth, depthRaw, { unit: "m" }) : field(null),
      maximumFloodHeightTime: field(null),
      floodStartedAt: field(started.time, manilaLabel(input.startedAt), { date: started.date }),
      floodSubsidedAt: recededParts
        ? field(recededParts.time, manilaLabel(input.recededAt as string), { date: recededParts.date })
        : field(null),
    },
    rainfall: {
      rainfallStartedAt: field(null),
      rainfallEndedAt: field(null),
      rainfallIntensity: field(rainy ? (sky?.label ?? null) : null),
    },
    intervention: {
      interventionText: field(null),
      interventionType: { value: null, status: "missing", raw: null, origin: "system_derived" },
    },
  };

  const missing = [
    !input.landmark && "locations[0].landmark",
    !place?.road && "locations[0].roadName",
    !input.recededAt && "locations[0].flood.floodSubsidedAt",
  ].filter((v): v is string => Boolean(v));

  return {
    id: input.id,
    messageId: input.id,
    platform: MOBILE_REPORT_PLATFORM,
    sourceKey: `${MOBILE_REPORT_PLATFORM}:${input.id}`,
    deviceId: null,
    source: {
      platform: MOBILE_REPORT_PLATFORM,
      platformBasis: "okb_mobile_form",
      messageId: input.id,
      clientMessageId: input.id,
      fingerprint: null,
      deviceId: null,
      groupId: null,
      groupName: MOBILE_GROUP_NAME,
      senderId: null,
      senderName: input.senderName ?? "Anonymous",
      messageText,
      messageTimestamp: at,
      receivedAt: at,
      capturedAt: input.photos[0]?.takenAt ?? at,
      sourcePackage: null,
      mediaIndicator: { mediaType: "IMAGE", mediaStatus: `${photoCount} geotagged photo${photoCount === 1 ? "" : "s"}` },
    },
    status: "needs_review" as BridgeReportStatus,
    reportType: "flood_monitoring",
    classification: {
      reportType: "flood_monitoring",
      confidence: "high",
      basis: "okb_mobile_form",
      rationale: "Sent from the OKB mobile flood report page with geotagged photos.",
    },
    extraction: {
      reportTitle: field(`Community flood report — ${input.locationText}`),
      remarks: field(input.remarks),
      reporting: {
        reportDate: field(sent.date, manilaLabel(at)),
        reportTime: field(sent.time, manilaLabel(at)),
        inspectionDate: field(null),
        inspectionTime: field(null),
      },
      administrative: {
        region: field(place?.region ?? null),
        districtEngineeringOffice: field(null),
        province: field(place?.province ?? null),
        municipality: field(place?.city ?? null),
        barangay: field(place?.barangay ?? null),
      },
      preparedBy: {
        name: field(input.senderName),
        position: field(null),
        office: field(null),
      },
      locations: [locationFields],
    },
    summary,
    extractionMeta: {
      confidence: "high",
      missingFields: missing,
      ambiguousFields: [],
      notApplicableFields: [],
      warnings: [
        {
          code: "PUBLIC_SUBMISSION",
          message: "Sent by a member of the public from the OKB mobile page. Check the geotagged photos before approving.",
        },
      ],
      model: "OKB mobile form",
      promptVersion: "okb-mobile-v1",
      schemaVersion: 1,
      extractedAt: null,
    },
    processing: { attempts: 0, lastAttemptAt: null, lastError: null, history: [] },
    review: { linkedMessageIds: [], history: [] },
    mobile: {
      version: 1,
      photos: input.photos.map((p) => ({
        key: p.key,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracyM: p.accuracyM,
        takenAt: p.takenAt,
      })),
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyM: input.accuracyM,
      locationText: input.locationText,
      landmark: input.landmark,
      place,
      level: input.level,
      depthM: depth,
      roadStatus: input.roadStatus,
      weather: input.weather,
      startedAt: input.startedAt,
      recededAt: input.recededAt,
      remarks: input.remarks,
      senderName: input.senderName,
      contactNumber: input.contactNumber,
    },
    createdAt: at,
    updatedAt: at,
  };
}

export type MobileRecord = ReturnType<typeof buildMobileRecord>;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Public map view of a stored mobile report row (null when it has no usable position). `liveRain`: PAGASA
 * measures rain or has a warning for Metro Manila now (keeps dry-weather reports at least 4 h).
 */
export function toPublicReport(
  row: { id: string; status: string | null; created_at: string; record: unknown },
  liveRain = false,
  now = Date.now(),
): PublicFloodReport | null {
  const record = obj(row.record);
  const m = obj(record.mobile);
  const lat = num(m.latitude);
  const lng = num(m.longitude);
  if (lat === null || lng === null) return null;
  const place = obj(m.place);
  const level = floodLevel(str(m.level));
  const depth = num(m.depthM);
  const recededAt = str(m.recededAt);
  const receded = recededAt !== null && Date.parse(recededAt) <= now;
  const weatherId = str(m.weather);
  const expiresAt = Date.parse(row.created_at) + mobileExpiryHours(weatherId, liveRain) * 3_600_000;
  const clearsAt = recededAt ? Math.min(Date.parse(recededAt), expiresAt) : expiresAt;
  const expired = !receded && Number.isFinite(expiresAt) && expiresAt <= now;
  const status = (str(row.status) ?? "needs_review") as BridgeReportStatus;
  const photos = Array.isArray(m.photos)
    ? m.photos.flatMap((p) => {
        const o = obj(p);
        const key = str(o.key);
        if (!key || !key.startsWith("flood-reports/") || key.includes("..")) return [];
        return [
          {
            key,
            url: reportPhotoUrl(key),
            latitude: num(o.latitude),
            longitude: num(o.longitude),
            accuracyM: num(o.accuracyM),
            takenAt: str(o.takenAt),
          },
        ];
      })
    : [];
  return {
    id: row.id,
    reference: reportReference(row.id, row.created_at),
    status,
    verified: status === "approved",
    latitude: lat,
    longitude: lng,
    locationText: str(m.locationText) ?? "Reported location",
    landmark: str(m.landmark),
    area: [str(place.barangay), str(place.city)].filter(Boolean).join(", ") || null,
    levelLabel: level?.label ?? null,
    depthM: depth,
    severity: floodSeverity(depth),
    roadStatus: roadStatus(str(m.roadStatus))?.label ?? null,
    weather: weather(weatherId)?.label ?? null,
    startedAt: str(m.startedAt),
    recededAt,
    receded,
    expired,
    active: !receded && !expired,
    clearsAt: Number.isFinite(clearsAt) ? new Date(clearsAt).toISOString() : null,
    clearRule: recededAt ? null : expiryReason(weatherId, liveRain),
    remarks: str(m.remarks),
    senderName: str(m.senderName),
    reportedAt: row.created_at,
    photos,
  };
}

/** The sender's own view of a stored report: the map view plus the form answers to edit. */
export function toMyReport(
  row: { id: string; status: string | null; created_at: string; record: unknown },
  liveRain = false,
): MyFloodReport | null {
  const view = toPublicReport(row, liveRain);
  if (!view) return null;
  const m = obj(obj(row.record).mobile);
  const level = floodLevel(str(m.level));
  const depth = num(m.depthM);
  const placeObj = obj(m.place);
  const place: PlaceName | null = str(placeObj.label)
    ? {
        label: str(placeObj.label) as string,
        road: str(placeObj.road),
        barangay: str(placeObj.barangay),
        city: str(placeObj.city),
        province: str(placeObj.province),
        region: str(placeObj.region),
      }
    : null;
  const form: FloodReportFormValues = {
    latitude: view.latitude,
    longitude: view.longitude,
    accuracyM: num(m.accuracyM),
    locationText: view.locationText,
    landmark: str(m.landmark),
    place,
    level: (level?.id ?? "knee") as FloodReportFormValues["level"],
    // A depth that is not the gauge level's own was typed in centimeters.
    depthCm: depth !== null && level && Math.abs(depth - level.meters) > 0.001 ? Math.round(depth * 100) : null,
    roadStatus: (roadStatus(str(m.roadStatus))?.id ?? "passable_all") as FloodReportFormValues["roadStatus"],
    weather: (weather(str(m.weather))?.id ?? "cloudy") as FloodReportFormValues["weather"],
    startedAt: str(m.startedAt) ?? row.created_at,
    recededAt: str(m.recededAt),
    remarks: str(m.remarks),
    senderName: str(m.senderName),
    contactNumber: str(m.contactNumber),
  };
  return { ...view, form, editable: view.status !== "rejected" && view.status !== "ignored", editedAt: str(m.editedAt) };
}
