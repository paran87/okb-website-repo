/**
 * Flood report feature - domain types.
 *
 * The public sends a report from the mobile page (/report-flood): up to five geotagged photos (stored in
 * Cloudflare R2) and a short form. The report is saved as an `okb_bridge_reports` row (platform
 * `okb_mobile`) so it shows in Incoming Reports and on the flood maps next to the WhatsApp/Viber reports.
 */
import type { FloodSeverity } from "@/features/incident/lib/flood-severity";
import type { BridgeReportStatus, ReportPhoto, ReportVideo } from "@/features/reports/types";
import type { FloodLevelId, RoadStatusId, WeatherId } from "./lib/options";
import type { FloodStretch } from "./lib/stretch";

export type { ReportPhoto, ReportVideo };

/** Where a report came from: the OKB mobile page, or a WhatsApp / Viber group (through the OKB Bridge). */
export type ReportSource = "okb_mobile" | "whatsapp" | "viber";

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

/** A video recorded on the page and uploaded to R2: where recording started, and its first frame as a JPEG. */
export interface UploadedVideo extends PhotoGeotag {
  key: string;
  posterKey: string;
  durationS: number | null;
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
  /** DEO of the nearest national road (a suggestion for the form; not saved with the place). */
  nearestDeo?: string | null;
}

/** Body of POST /api/flood-reports. */
export interface FloodReportInput {
  /** Client-made UUID; photo keys are filed under it. */
  id: string;
  photos: UploadedPhoto[];
  /** At most one video (older pages send none). */
  videos?: UploadedVideo[];
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  /** Street / place the sender confirmed (prefilled from the GPS position). */
  locationText: string;
  landmark: string | null;
  place: PlaceName | null;
  /** DPWH District Engineering Office, when the sender knows it ("North Manila DEO"). */
  deo: string | null;
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

/**
 * One report on the public map (no contact number; the sender's name only when they gave one). A WhatsApp or
 * Viber report shows its message text instead of form answers, one pin per flooded location it names.
 */
export interface PublicFloodReport {
  /** Pin id: the report id (OKB Mobile), or `<report id>~<location index>` (WhatsApp / Viber). */
  id: string;
  /** The stored report this pin belongs to. */
  reportId: string;
  source: ReportSource;
  /** WhatsApp / Viber: the message as sent (phone numbers and e-mail addresses removed). */
  text: string | null;
  reference: string;
  status: BridgeReportStatus;
  verified: boolean;
  latitude: number;
  longitude: number;
  /** OKB Mobile: the flooded road between photos taken far apart (null: one pin). */
  stretch: FloodStretch | null;
  /** OKB Mobile with 2+ photos: how their locations were placed (a stretch, or why one pin). */
  placement: string | null;
  locationText: string;
  landmark: string | null;
  area: string | null;
  /** DPWH District Engineering Office, when the report names one. */
  deo: string | null;
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
  /** Videos OKB operators added (Admin → Reports). */
  videos: ReportVideo[];
}

/** What POST /api/flood-reports returns: the report and the sender's secret edit key (shown only this once). */
export interface SubmittedReport {
  report: PublicFloodReport;
  editToken: string;
  /** Goes into the bridge's automated WhatsApp report (sent from a test address, or open to all). */
  inConsolidated: boolean;
}

/** The form answers of a report, as the edit form starts from them. */
export type FloodReportFormValues = Omit<FloodReportInput, "id" | "photos" | "videos" | "website">;

/** A report sent from this phone (checked with its edit key): the map view plus what the edit form needs. */
export interface MyFloodReport extends PublicFloodReport {
  form: FloodReportFormValues;
  /** False once OKB operators rejected it (it can still be deleted). */
  editable: boolean;
  editedAt: string | null;
}

/** Admin → Reports: a mobile report with the fields only operators see. */
export interface AdminMobileReport extends MyFloodReport {
  kind: "mobile";
  contactNumber: string | null;
  inConsolidated: boolean;
  /** The sender can still change it from their phone. */
  hasEditKey: boolean;
  operatorEditedBy: string | null;
}

/** Admin → Reports: a WhatsApp / Viber flood report (the bridge's); operators add photos and videos or delete it. */
export interface AdminBridgeReport {
  kind: "bridge";
  id: string;
  /**
   * What the OKB Bridge made of the message: a flood report, a message classified as not a flood report
   * (chat, ignored), or one not processed yet / failed. Incoming Reports and the Archive show all three.
   */
  messageType: "flood" | "not_flood" | "unprocessed";
  reference: string;
  source: Exclude<ReportSource, "okb_mobile">;
  status: BridgeReportStatus;
  reportedAt: string;
  groupName: string | null;
  senderName: string | null;
  /** The message as sent (operators see it in full). */
  text: string | null;
  summary: string | null;
  /** Flooded locations it names, as they show on the maps. */
  locations: { label: string; levelLabel: string | null; depthM: number | null; roadStatus: string | null; onMap: boolean }[];
  photos: ReportPhoto[];
  videos: ReportVideo[];
}

export type AdminReport = AdminMobileReport | AdminBridgeReport;

export interface PublicFloodReportList {
  generatedAt: string;
  hours: number;
  /** PAGASA measures rain or has a warning for Metro Manila now. */
  liveRain: boolean;
  reports: PublicFloodReport[];
  /** False when report storage is not configured on the server. */
  configured: boolean;
}

/** A video recorded on the page and not sent yet (browser only). */
export interface CapturedVideo extends PhotoGeotag {
  id: string;
  blob: Blob;
  url: string;
  /** First frame with the GPS stamp (JPEG). */
  poster: Blob;
  posterUrl: string;
  durationS: number;
  key?: string;
  posterKey?: string;
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
