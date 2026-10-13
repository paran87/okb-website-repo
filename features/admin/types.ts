/** Shared shapes for the Admin page (API ↔ UI). */

export type VisitArea = "website" | "command";
export type StatsRange = "today" | "7d" | "30d" | "90d";

export interface AdminState {
  /** An admin key (or the operator key as a stand-in) is set on the server. */
  configured: boolean;
  /** Signed in as admin. */
  granted: boolean;
  name: string | null;
  /** Signed in with the operator access key because OKB_ADMIN_KEY is not set. */
  usingFallbackKey: boolean;
  supabase: { configured: boolean; ready: boolean; projectRef: string | null };
  storage: { configured: boolean; bucket: string | null };
}

export interface BreakdownRow {
  label: string;
  views: number;
  visitors: number;
}

export interface VisitStats {
  range: StatsRange;
  bucket: "hour" | "day";
  from: string;
  to: string;
  pageViews: number;
  visitors: number;
  sessions: number;
  newVisitors: number;
  liveVisitors: number;
  /** Every bucket in the range (empty ones filled with zero); `t` is Philippine local time. */
  series: { t: string; views: number; visitors: number }[];
  /** Page views by hour of day (0–23, Philippine time). */
  hours: { hour: number; views: number }[];
  areas: BreakdownRow[];
  pages: BreakdownRow[];
  countries: BreakdownRow[];
  cities: BreakdownRow[];
  devices: BreakdownRow[];
  browsers: BreakdownRow[];
  os: BreakdownRow[];
  referrers: BreakdownRow[];
}

export interface VisitRecord {
  id: number;
  occurredAt: string;
  visitorId: string;
  isNewVisitor: boolean;
  area: VisitArea;
  path: string;
  pageTitle: string | null;
  referrerHost: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  screen: string | null;
  language: string | null;
}

export interface VisitPage {
  items: VisitRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export type MediaKind = "photo" | "video";

export interface MediaCollection {
  id: string;
  label: string;
  area: VisitArea;
  description: string;
}

export interface AdminMediaItem {
  key: string;
  name: string;
  kind: MediaKind;
  url: string;
  size: number;
  lastModified: string;
  title: string | null;
  caption: string | null;
  /** Command Center collections: the file is shown in the Operations gallery. */
  shownInCommandCenter: boolean | null;
}

export interface AdminMediaList {
  collection: string;
  view: "files" | "trash";
  items: AdminMediaItem[];
  /** Captions could not be loaded (Admin tables not set up yet). */
  captionsAvailable: boolean;
}

export interface UploadTicket {
  key: string;
  uploadUrl: string;
  contentType: string;
  /** Largest file the server-side fallback accepts when direct upload is blocked. */
  proxyLimit: number;
}

export interface StorageCheckStep {
  id: "list" | "write" | "delete";
  label: string;
  ok: boolean;
  code: string | null;
  hint: string | null;
}

export interface StorageCheck {
  configured: boolean;
  bucket: string | null;
  /** OPERATIONS_R2_BUCKET is set (otherwise the default name is used). */
  bucketFromEnv: boolean;
  host: string | null;
  account: string | null;
  /** Which variable each setting is read from (names only). */
  env: {
    endpointVar: string | null;
    accessKeyVar: string | null;
    secretVar: string | null;
    bucketVar: string | null;
    jurisdictionVar: string | null;
  };
  steps: StorageCheckStep[];
  ok: boolean;
}
