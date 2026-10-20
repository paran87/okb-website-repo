import "server-only";
import { reportMediaIndex } from "@/features/flood-report/server/media";
import type { BridgeReportRecord, ExtractedField, ExtractedLocation } from "@/features/reports/types";
import type { ReportStore } from "@/features/reports/server/store";
import { isClear, isFlooded, locationKey, observeReport, provided } from "@/features/reports/lib/observations";
import { messageTime } from "@/features/reports/lib/series";
import { reportReference } from "@/features/reports/lib/format";
import { getPagasaWeatherBulletin } from "@/features/weather/services/pagasa.service";
import type { FloodMapData, FloodMapLocation, FloodMapWeather } from "@/features/incident/types";
import { floodSeverity } from "@/features/incident/lib/flood-severity";
import { crossStreet, normalizeRoad, roadCandidates } from "@/features/incident/lib/road-match";
import { MOBILE_REPORT_PLATFORM } from "@/features/reports/types";
import { expiryReason, MOBILE_EXPIRY_MAX_HOURS, mobileExpiryHours } from "@/features/flood-report/lib/expiry";

const HOUR = 3_600_000;

/**
 * How long a flooded location stays highlighted after its latest report:
 *  - 3 h — floodwater on roads usually recedes within hours, so a place no one reports again is cleared and
 *    the map is back to normal;
 *  - 6 h while it actually rains in Metro Manila (PAGASA measures rainfall) or a PAGASA rainfall / cyclone
 *    warning for Metro Manila is in effect. A sky description alone ("Light rains" at 0 mm/hr) does not count,
 *    and unknown weather counts as normal.
 * A newer report that says "subsided" or "no flooding" clears a location at once, whatever the weather, and a
 * report that gives the time the flood receded clears it at that time.
 *
 * Reports from the OKB mobile page clear by the weather their sender chose instead (2–3 h dry, 4–6 h rain;
 * features/flood-report/lib/expiry.ts). A report past its own time no longer decides its place, so an older
 * report that is still within its time can show.
 */
export const FLOOD_MAP_RULE = { wetHours: 6, normalHours: 3 } as const;

/** PAGASA advisories that concern Metro Manila (the bridge's reports come from NCR DEOs). */
const NCR = /metro\s*manila|\bncr\b|national\s+capital/i;

export async function floodMapWeather(): Promise<FloodMapWeather> {
  try {
    const bulletin = await getPagasaWeatherBulletin();
    const ncr = bulletin.ncrObservation ?? null;
    const advisories = bulletin.advisories
      .filter((a) => NCR.test(`${a.headline} ${a.areas}`))
      .map((a) => a.headline);
    if (bulletin.source !== "pagasa-live" || !ncr) {
      return { state: "unknown", label: "Live PAGASA weather unavailable", rainfallMmHr: null, condition: null, advisories, updatedAt: null };
    }
    const raining = Number.isFinite(ncr.rainfall) && ncr.rainfall > 0;
    const stormy = ncr.stormTone === "warning" || ncr.stormTone === "critical";
    // Measured rain or a warning; a sky description alone ("Light rains" at 0 mm/hr) is not rain on the roads.
    const wet = raining || stormy || advisories.length > 0;
    const reasons = [
      raining ? `rain ${ncr.rainfall} mm/hr` : null,
      stormy ? ncr.stormStatus : null,
      advisories.length ? `${advisories.length} PAGASA warning${advisories.length === 1 ? "" : "s"} for Metro Manila` : null,
    ].filter(Boolean);
    return {
      state: wet ? "wet" : "normal",
      label: wet ? `Rain or warning in effect: ${reasons.join(" · ")}` : "No rain and no warnings in Metro Manila",
      rainfallMmHr: Number.isFinite(ncr.rainfall) ? ncr.rainfall : null,
      condition: ncr.condition ?? null,
      advisories,
      updatedAt: ncr.updatedAt ?? null,
    };
  } catch {
    return { state: "unknown", label: "Live PAGASA weather unavailable", rainfallMmHr: null, condition: null, advisories: [], updatedAt: null };
  }
}

function text(field: ExtractedField | null | undefined): string | null {
  const v = provided(field);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function num(field: ExtractedField<number> | null | undefined): number | null {
  const v = provided(field);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** A place on the road network as reports name it: the road and, when given, the cross street. */
export interface Place {
  road: string;
  cross: string | null;
}

/**
 * The place a report location names, from its extracted road and landmark (else its location text), so the
 * same place matches however it is worded: "Blumentritt Rd., Manila City" with landmark "P. Margal St." is
 * the same place as "Blumentritt Rd., Manila City Limit/Landmark: P. Margal St.".
 */
function placeOf(loc: ExtractedLocation, label: string): Place | null {
  const road = normalizeRoad(text(loc.roadName)) || locationKey(label);
  if (!road) return null;
  const cross = normalizeRoad(crossStreet(text(loc.landmark))) || null;
  return { road, cross: cross === road ? null : cross };
}

/** Same place: the same road, at the same cross street (or one of the two reports names none). */
function samePlace(a: Place, b: Place): boolean {
  return a.road === b.road && (!a.cross || !b.cross || a.cross === b.cross);
}

const PARTIAL = /\b(partial(?:ly)?|subsiding|receding|slowly|still)\b/i;
const MANILA_OFFSET = 8 * HOUR;

/**
 * When the flood receded, from the report's "Time of Receding" ("21:40" on the report's Manila date; a time
 * well after the report is from the evening before). Null when not given or only partly receded.
 */
function recededAt(loc: ExtractedLocation, reportedAt: number): number | null {
  const value = provided(loc.flood.floodSubsidedAt);
  const raw = loc.flood.floodSubsidedAt.raw ?? "";
  if (typeof value !== "string" || !value.trim() || PARTIAL.test(raw) || !Number.isFinite(reportedAt)) return null;
  const clock = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!clock) {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : null;
  }
  const day = new Date(reportedAt + MANILA_OFFSET);
  let t = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), Number(clock[1]), Number(clock[2])) - MANILA_OFFSET;
  if (t > reportedAt + 6 * HOUR) t -= 24 * HOUR;
  return t;
}

/** One location a report speaks about: its place and what the report says there. */
export interface ReportObservation {
  /** Index of the location in the report's extraction. */
  index: number;
  key: string;
  place: Place | null;
  flooded: boolean;
  clear: boolean;
  /** When the report says the flood receded (null when not given). */
  recededAt: number | null;
  /** The location as the maps draw it (flooded observations only). */
  location: FloodMapLocation | null;
}

/** What a report says about each location it names, as the maps read it (no rule about newer reports or time). */
export function reportObservations(record: BridgeReportRecord, activeHours: number, liveRain: boolean): ReportObservation[] {
  const reportedAt = messageTime(record);
  const at = Date.parse(reportedAt);
  const fromMobile = record.platform === MOBILE_REPORT_PLATFORM;
  const hours = fromMobile ? mobileExpiryHours(record.mobileWeather, liveRain) : activeHours;
  const admin = record.extraction?.administrative;
  const out: ReportObservation[] = [];
  for (const o of observeReport(record)) {
    const loc: ExtractedLocation | undefined = record.extraction?.locations?.[o.index];
    if (!loc) continue;
    const place = placeOf(loc, o.label);
    const key = place ? `${place.road}${place.cross ? ` cor ${place.cross}` : ""}` : (o.key ?? `${record.id}:${o.index}`);
    const flooded = isFlooded(o.condition);
    const receded = flooded ? recededAt(loc, at) : null;
    const clearsAt = Math.min(at + hours * HOUR, receded ?? Infinity);
    out.push({
      index: o.index,
      key,
      place,
      flooded,
      clear: isClear(o.condition),
      recededAt: receded,
      location: flooded
        ? {
            key,
            label: o.label,
            roads: roadCandidates(text(loc.roadName), o.label, text(loc.landmark)),
            landmark: text(loc.landmark),
            barangay: text(loc.barangay) ?? text(admin?.barangay),
            municipality: text(loc.municipality) ?? text(admin?.municipality),
            province: text(loc.province) ?? text(admin?.province),
            deo: text(admin?.districtEngineeringOffice),
            latitude: num(loc.latitude),
            longitude: num(loc.longitude),
            heightM: o.heightM,
            heightRaw: o.heightRaw,
            heightApproximate: o.heightApproximate,
            severity: o.condition === "flooded" ? floodSeverity(o.heightM) : "unmeasured",
            roadStatus: o.roadStatus,
            reportId: record.id,
            reference: reportReference(record.id, record.createdAt),
            reportedAt,
            groupName: record.source?.groupName ?? null,
            clearsAt: Number.isFinite(clearsAt) ? new Date(clearsAt).toISOString() : reportedAt,
            photos: record.photos,
            videos: record.mobileVideos,
            fromMobile,
            stretch: record.mobileStretch,
            clearRule: fromMobile ? expiryReason(record.mobileWeather, liveRain) : null,
          }
        : null,
    });
  }
  return out;
}

/**
 * Flooded locations for the map from processed reports (newest first): the latest report of each place
 * decides, whatever its wording. Flooded → highlighted while recent enough for the weather, until the time it
 * receded when the report gives one; subsided / no flooding → cleared.
 */
export function buildFloodMap(
  reports: BridgeReportRecord[],
  weather: FloodMapWeather,
  now: Date = new Date(),
): FloodMapData {
  const activeHours = weather.state === "wet" ? FLOOD_MAP_RULE.wetHours : FLOOD_MAP_RULE.normalHours;
  const liveRain = weather.state === "wet";
  const seen = new Set<string>();
  const decided: Place[] = [];
  const locations: FloodMapLocation[] = [];
  let clearedByReport = 0;
  let clearedByWeather = 0;

  const ordered = [...reports].sort((a, b) => Date.parse(messageTime(b)) - Date.parse(messageTime(a)));
  for (const record of ordered) {
    const at = Date.parse(messageTime(record));
    const hours = record.platform === MOBILE_REPORT_PLATFORM ? mobileExpiryHours(record.mobileWeather, liveRain) : activeHours;
    for (const o of reportObservations(record, activeHours, liveRain)) {
      const { key, place } = o;
      // A newer report of this place already decided.
      if (seen.has(key) || (place && decided.some((d) => samePlace(d, place)))) continue;
      // Past its own time: cleared by the weather rule, and it no longer speaks for the place.
      if (o.flooded && (!Number.isFinite(at) || at < now.getTime() - hours * HOUR)) {
        clearedByWeather++;
        continue;
      }
      const decide = () => {
        seen.add(key);
        if (place) decided.push(place);
      };
      if (o.clear) {
        decide();
        clearedByReport++;
        continue;
      }
      if (!o.flooded || !o.location) continue; // nothing said about flooding here
      decide();
      if (o.recededAt !== null && o.recededAt <= now.getTime()) {
        clearedByReport++;
        continue;
      }
      locations.push(o.location);
    }
  }
  return {
    generatedAt: now.toISOString(),
    weather,
    activeHours,
    rule: { ...FLOOD_MAP_RULE },
    locations,
    clearedByReport,
    clearedByWeather,
  };
}

let memo: { at: number; kind: string; data: FloodMapData } | null = null;

/** Flood map for the Incidents tab (30-second memo per data source). */
export async function getFloodMap(store: ReportStore): Promise<FloodMapData> {
  if (memo && memo.kind === store.kind && Date.now() - memo.at < 30_000) return memo.data;
  const to = new Date();
  const from = new Date(to.getTime() - Math.max(FLOOD_MAP_RULE.wetHours, MOBILE_EXPIRY_MAX_HOURS) * HOUR);
  const [reports, weather, media] = await Promise.all([
    store.listFloodReports({ from, to, limit: 400 }),
    floodMapWeather(),
    reportMediaIndex(),
  ]);
  const built = buildFloodMap(reports, weather, to);
  // Photos and videos OKB operators added in Admin → Reports.
  const data = {
    ...built,
    locations: built.locations.map((l) => {
      const added = media.get(l.reportId);
      return added ? { ...l, photos: [...l.photos, ...added.photos], videos: [...l.videos, ...added.videos] } : l;
    }),
  };
  memo = { at: Date.now(), kind: store.kind, data };
  return data;
}
