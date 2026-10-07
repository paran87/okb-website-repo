import "server-only";
import type { BridgeReportRecord, ExtractedField, ExtractedLocation } from "@/features/reports/types";
import type { ReportStore } from "@/features/reports/server/store";
import { isClear, isFlooded, locationKey, observeReport, provided } from "@/features/reports/lib/observations";
import { messageTime } from "@/features/reports/lib/series";
import { reportReference } from "@/features/reports/lib/format";
import { getPagasaWeatherBulletin } from "@/features/weather/services/pagasa.service";
import type { FloodMapData, FloodMapLocation, FloodMapWeather } from "@/features/incident/types";
import { floodSeverity } from "@/features/incident/lib/flood-severity";
import { roadCandidates } from "@/features/incident/lib/road-match";

const HOUR = 3_600_000;

/**
 * How long a flooded location stays highlighted after its latest report:
 *  - while it rains or a PAGASA rainfall / cyclone warning is in effect (or the weather is unknown): 24 h;
 *  - once the weather is normal (no rain, no warning): 3 h — floodwater on roads usually recedes within
 *    hours after the rain stops, so older highlights are cleared and the map is back to normal.
 * A newer report that says "subsided" or "no flooding" clears a location at once, whatever the weather.
 */
export const FLOOD_MAP_RULE = { wetHours: 24, normalHours: 3 } as const;

/** PAGASA advisories that concern Metro Manila (the bridge's reports come from NCR DEOs). */
const NCR = /metro\s*manila|\bncr\b|national\s+capital/i;
const WET_CONDITION = /rain|shower|thunder|storm|monsoon|habagat|typhoon|cyclone/i;

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
    const wetSky = WET_CONDITION.test(ncr.condition ?? "");
    const wet = raining || stormy || wetSky || advisories.length > 0;
    const reasons = [
      raining ? `rain ${ncr.rainfall} mm/hr` : null,
      wetSky && !raining ? ncr.condition : null,
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

/**
 * Flooded locations for the map from processed reports (newest first): the latest report of each location
 * decides. Flooded → highlighted while recent enough for the weather; subsided / no flooding → cleared.
 */
export function buildFloodMap(
  reports: BridgeReportRecord[],
  weather: FloodMapWeather,
  now: Date = new Date(),
): FloodMapData {
  const activeHours = weather.state === "normal" ? FLOOD_MAP_RULE.normalHours : FLOOD_MAP_RULE.wetHours;
  const since = now.getTime() - activeHours * HOUR;
  const seen = new Set<string>();
  const locations: FloodMapLocation[] = [];
  let clearedByReport = 0;
  let clearedByWeather = 0;

  const ordered = [...reports].sort((a, b) => Date.parse(messageTime(b)) - Date.parse(messageTime(a)));
  for (const record of ordered) {
    const reportedAt = messageTime(record);
    const at = Date.parse(reportedAt);
    const admin = record.extraction?.administrative;
    for (const o of observeReport(record)) {
      const loc: ExtractedLocation | undefined = record.extraction?.locations?.[o.index];
      if (!loc) continue;
      const key = o.key ?? locationKey(o.label) ?? `${record.id}:${o.index}`;
      if (seen.has(key)) continue; // a newer report of this place already decided
      if (isClear(o.condition)) {
        seen.add(key);
        clearedByReport++;
        continue;
      }
      if (!isFlooded(o.condition)) continue; // nothing said about flooding here
      seen.add(key);
      if (!Number.isFinite(at) || at < since) {
        clearedByWeather++;
        continue;
      }
      locations.push({
        key,
        label: o.label,
        roads: roadCandidates(text(loc.roadName), o.label),
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
        clearsAt: new Date(at + activeHours * HOUR).toISOString(),
      });
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
  const from = new Date(to.getTime() - FLOOD_MAP_RULE.wetHours * HOUR);
  const [reports, weather] = await Promise.all([store.listFloodReports({ from, to, limit: 400 }), floodMapWeather()]);
  const data = buildFloodMap(reports, weather, to);
  memo = { at: Date.now(), kind: store.kind, data };
  return data;
}
