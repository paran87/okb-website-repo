import "server-only";
import { buildFloodMap, FLOOD_MAP_RULE, reportObservations } from "@/features/incident/server/flood-map";
import { pinOf, serverRoadIndex } from "@/features/incident/server/roads";
import { getReportStore } from "@/features/reports/server/index";
import { reportReference } from "@/features/reports/lib/format";
import { messageTime } from "@/features/reports/lib/series";
import { MOBILE_REPORT_PLATFORM, type BridgeReportRecord } from "@/features/reports/types";
import type { FloodMapWeather } from "@/features/incident/types";
import { NO_MEDIA, reportMediaIndex } from "@/features/flood-report/server/media";
import type { AdminBridgeReport, PublicFloodReport } from "@/features/flood-report/types";

/**
 * WhatsApp / Viber flood reports (received by the OKB Bridge) on the public OKB Mobile map and in
 * Admin → Reports. They are read as the Incidents map reads them: one pin per flooded location, placed by the
 * report's coordinates or on the road network, flooded while the Incidents map shows it.
 */

const HOUR = 3_600_000;

/** Phone numbers and e-mail addresses are taken out of message text shown to the public. */
const PHONE = /(?:\+?63[\s-]?|\b0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|\(?\b02\)?[\s-]?[2-9]\d{3}[\s-]?\d{4}\b/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

export function publicText(text: string | null | undefined): string | null {
  const t = (text ?? "").replace(EMAIL, "[e-mail removed]").replace(PHONE, "[number removed]").trim();
  return t ? t.slice(0, 4000) : null;
}

const sourceOf = (r: BridgeReportRecord): "whatsapp" | "viber" | null =>
  r.platform === "whatsapp" ? "whatsapp" : r.platform === "viber" ? "viber" : null;

/** Pins of the WhatsApp / Viber flood reports received in the last [hours]. */
export async function bridgePins(hours: number, weather: FloodMapWeather, now = new Date()): Promise<PublicFloodReport[]> {
  const store = getReportStore();
  if (!store) return [];
  const from = new Date(now.getTime() - Math.max(hours, FLOOD_MAP_RULE.wetHours) * HOUR);
  const [records, index, media] = await Promise.all([
    store.listFloodReports({ from, to: now, limit: 400 }),
    serverRoadIndex(),
    reportMediaIndex(),
  ]);
  const live = records.filter((r) => r.status !== "rejected");
  // What the Incidents map shows now: a pin is "flooded" exactly while its location is there.
  const current = new Set(buildFloodMap(live, weather, now).locations.map((l) => `${l.reportId}|${l.key}`));
  const liveRain = weather.state === "wet";
  const activeHours = liveRain ? FLOOD_MAP_RULE.wetHours : FLOOD_MAP_RULE.normalHours;
  const since = now.getTime() - hours * HOUR;
  const pins: PublicFloodReport[] = [];
  for (const record of live) {
    const source = sourceOf(record);
    if (!source || record.platform === MOBILE_REPORT_PLATFORM || Date.parse(messageTime(record)) < since) continue;
    const added = media.get(record.id) ?? NO_MEDIA;
    const text = publicText(record.source?.messageText);
    for (const o of reportObservations(record, activeHours, liveRain)) {
      const loc = o.location;
      if (!loc) continue;
      const at = pinOf(index, loc);
      if (!at) continue;
      const active = current.has(`${record.id}|${o.key}`);
      const receded = !active && o.recededAt !== null && o.recededAt <= now.getTime();
      pins.push({
        id: `${record.id}~${o.index}`,
        reportId: record.id,
        source,
        text,
        reference: loc.reference,
        status: record.status,
        verified: record.status === "approved",
        latitude: at.latitude,
        longitude: at.longitude,
        locationText: loc.label,
        landmark: loc.landmark,
        area: [loc.barangay, loc.municipality].filter(Boolean).join(", ") || null,
        levelLabel: loc.heightRaw,
        depthM: loc.heightM,
        severity: loc.severity,
        roadStatus: loc.roadStatus,
        weather: null,
        startedAt: null,
        recededAt: o.recededAt !== null ? new Date(o.recededAt).toISOString() : null,
        receded,
        expired: !active && !receded,
        active,
        clearsAt: loc.clearsAt,
        clearRule: o.recededAt !== null ? null : `${activeHours} h (${liveRain ? "while it rains" : "no rain"})`,
        remarks: null,
        senderName: null,
        reportedAt: loc.reportedAt,
        photos: added.photos,
        videos: added.videos,
      });
    }
  }
  return pins;
}

/** Admin → Reports: WhatsApp / Viber flood reports of the last [days] (any review state), newest first. */
export async function bridgeReportsForAdmin(days: number, weather: FloodMapWeather, now = new Date()): Promise<AdminBridgeReport[]> {
  const store = getReportStore();
  if (!store) return [];
  const from = new Date(now.getTime() - days * 24 * HOUR);
  const [records, media] = await Promise.all([store.listFloodReports({ from, to: now, limit: 500 }), reportMediaIndex()]);
  const current = new Set(buildFloodMap(records.filter((r) => r.status !== "rejected"), weather, now).locations.map((l) => `${l.reportId}|${l.key}`));
  const liveRain = weather.state === "wet";
  const activeHours = liveRain ? FLOOD_MAP_RULE.wetHours : FLOOD_MAP_RULE.normalHours;
  return records.flatMap((record): AdminBridgeReport[] => {
    const source = sourceOf(record);
    if (!source) return [];
    const added = media.get(record.id) ?? NO_MEDIA;
    return [
      {
        kind: "bridge",
        id: record.id,
        reference: reportReference(record.id, record.createdAt),
        source,
        status: record.status,
        reportedAt: messageTime(record),
        groupName: record.source?.groupName ?? null,
        senderName: record.source?.senderName ?? null,
        text: record.source?.messageText ?? null,
        summary: record.summary,
        locations: reportObservations(record, activeHours, liveRain).flatMap((o) =>
          o.location
            ? [
                {
                  label: o.location.label,
                  levelLabel: o.location.heightRaw,
                  depthM: o.location.heightM,
                  roadStatus: o.location.roadStatus,
                  onMap: current.has(`${record.id}|${o.key}`),
                },
              ]
            : [],
        ),
        photos: added.photos,
        videos: added.videos,
      },
    ];
  });
}
