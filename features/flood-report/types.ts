/**
 * Flood report feature - domain types.
 *
 * The public sends a report from the mobile page (/report-flood): up to five geotagged photos (stored in
 * Cloudflare R2) and a short form. The report is saved as an `okb_bridge_reports` row (platform
 * `okb_mobile`) so it shows in Incoming Reports and on the flood maps next to the WhatsApp/Viber reports.
 */
import type { FloodSeverity } from "@/features/incident/lib/flood-severity";
import type { BridgeReportStatus, ReportPhoto } from "@/features/reports/types";
import type { FloodLevelId, RoadStatusId, WeatherId } from "./lib/options";

export type { ReportPhoto };

/** Where a photo was taken, as the phone reported it. */
export interface PhotoGeotag {
  latitude: number;
  longitude: number;
  /** GPS accuracy radius in meters. */
  accuracyM: number | null;
  takenAt: string;
}

/** A photo already uploaded to R2, as sent with the report. */
export interface UploadedPhoto extends PhotoGeotag {
  key: string;
}

/** Place names for a point (OpenStreetMap reverse geocoding). */
export interface PlaceName {
  /** Short label, e.g. "Rizal Avenue, Santa Cruz, Manila". */
  label: string;
  road: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
}

/** Body of POST /api/flood-reports. */
export interface FloodReportInput {
  /** Client-made UUID; photo keys are filed under it. */
  id: string;
  photos: UploadedPhoto[];
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  /** Street / place the sender confirmed (prefilled from the GPS position). */
  locationText: string;
  landmark: string | null;
  place: PlaceName | null;
  level: FloodLevelId;
  /** Measured depth in centimeters when the sender knows it (overrides the level's depth). */
  depthCm: number | null;
  roadStatus: RoadStatusId;
  weather: WeatherId;
  startedAt: string;
  /** Null while the flood has not receded. */
  recededAt: string | null;
  remarks: string | null;
  senderName: string | null;
  contactNumber: string | null;
  /** Honeypot: always empty for people. */
  website?: string;
}

/** One report on the public map (no contact number; the sender's name only when they gave one). */
export interface PublicFloodReport {
  id: string;
  reference: string;
  status: BridgeReportStatus;
  verified: boolean;
  latitude: number;
  longitude: number;
  locationText: string;
  landmark: string | null;
  area: string | null;
  levelLabel: string | null;
  depthM: number | null;
  severity: FloodSeverity;
  roadStatus: string | null;
  weather: string | null;
  startedAt: string | null;
  recededAt: string | null;
  receded: boolean;
  /** No receded time came and its weather time ran out (2–3 h dry, 4–6 h rain). */
  expired: boolean;
  /** Still flooded on the map now (neither receded nor expired). */
  active: boolean;
  /** When it leaves the map (the receded time, or report time + its weather hours). */
  clearsAt: string | null;
  /** Why it clears then, e.g. "6 h (heavy rain)". */
  clearRule: string | null;
  remarks: string | null;
  senderName: string | null;
  reportedAt: string;
  photos: ReportPhoto[];
}

/** What POST /api/flood-reports returns: the report and the sender's secret edit key (shown only this once). */
export interface SubmittedReport {
  report: PublicFloodReport;
  editToken: string;
}

/** The form answers of a report, as the edit form starts from them. */
export type FloodReportFormValues = Omit<FloodReportInput, "id" | "photos" | "website">;

/** A report sent from this phone (checked with its edit key): the map view plus what the edit form needs. */
export interface MyFloodReport extends PublicFloodReport {
  form: FloodReportFormValues;
  /** False once OKB operators rejected it (it can still be deleted). */
  editable: boolean;
  editedAt: string | null;
}

export interface PublicFloodReportList {
  generatedAt: string;
  hours: number;
  /** PAGASA measures rain or has a warning for Metro Manila now. */
  liveRain: boolean;
  reports: PublicFloodReport[];
  /** False when report storage is not configured on the server. */
  configured: boolean;
}

/** A photo taken on the page and not sent yet (browser only). */
export interface CapturedPhoto extends PhotoGeotag {
  id: string;
  blob: Blob;
  /** Object URL for the thumbnail. */
  url: string;
  /** Storage key once uploaded (kept so a retry does not upload it again). */
  key?: string;
}
