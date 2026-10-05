/**
 * Monitoring series and successive-report comparison.
 *
 * Original reports are never merged: a series is a computed relationship
 * between separate, immutable report records. Reports are linked only on
 * concrete evidence (same source group, same office or report title, and the
 * same monitored locations within a time window); when the evidence is weak
 * they stay ungrouped.
 *
 * Comparisons only claim a change when both the previous and the current
 * report state the value. Missing values stay unknown.
 */
import type {
  BridgeReportRecord,
  FloodMetrics,
  LocationChange,
  LocationHistory,
  LocationObservation,
  SeriesComparison,
  SeriesMemberRef,
} from "@/features/reports/types";
import { formatClock, formatGap, formatMeters, reportReference } from "@/features/reports/lib/format";
import { platformLabel } from "@/features/reports/lib/labels";
import {
  describeObservation,
  floodMetrics,
  isClear,
  isFlooded,
  observeReport,
  observeWeather,
  provided,
  sameText,
} from "@/features/reports/lib/observations";

/** How far apart two reports may be and still belong to one series. */
export const SERIES_WINDOW_HOURS = 72;

const MONTHS =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b\.?/gi;

export function messageTime(record: BridgeReportRecord): string {
  return record.source.messageTimestamp ?? record.source.receivedAt ?? record.createdAt;
}

function timeMs(record: BridgeReportRecord): number {
  const t = Date.parse(messageTime(record));
  return Number.isNaN(t) ? 0 : t;
}

function firstLine(text: string | null): string | null {
  if (!text) return null;
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return line ? line.slice(0, 160) : null;
}

/** Title without its "as of <date/time>" part, for display. */
function cleanTitle(title: string): string {
  return title
    .replace(/\s+(as\s+of|dated?|@)\b.*$/i, "")
    .replace(MONTHS, " ")
    .replace(/\d{1,4}([:/.-]\d{1,4})*\s*(am|pm|h|hrs)?\b/gi, " ")
    .replace(/[,;:\-–—]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normKey(text: string | null): string | null {
  if (!text) return null;
  const k = cleanTitle(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return k.length >= 3 ? k : null;
}

export interface SeriesIdentity {
  officeKey: string | null;
  officeLabel: string | null;
  titleKey: string | null;
  titleLabel: string | null;
  titleFromMessage: boolean;
}

export function seriesIdentity(record: BridgeReportRecord): SeriesIdentity {
  const ex = record.extraction;
  const office =
    provided(ex?.administrative.districtEngineeringOffice) ?? provided(ex?.preparedBy.office) ?? null;
  const extractedTitle = provided(ex?.reportTitle);
  const title = extractedTitle ?? firstLine(record.source.messageText);
  return {
    officeKey: normKey(office),
    officeLabel: office,
    titleKey: normKey(title),
    titleLabel: title ? cleanTitle(title) || title : null,
    titleFromMessage: !extractedTitle && Boolean(title),
  };
}

interface Indexed {
  record: BridgeReportRecord;
  obs: LocationObservation[];
  keys: Set<string>;
  identity: SeriesIdentity;
}

function index(record: BridgeReportRecord): Indexed {
  const obs = observeReport(record);
  return {
    record,
    obs,
    keys: new Set(obs.map((o) => o.key).filter((k): k is string => Boolean(k))),
    identity: seriesIdentity(record),
  };
}

export interface LinkDecision {
  linked: boolean;
  evidence: string[];
  reason: string | null;
}

/** Decides whether two reports belong to the same monitoring series. */
export function linkReports(a: Indexed, b: Indexed): LinkDecision {
  const sa = a.record.source;
  const sb = b.record.source;
  if ((a.record.platform ?? null) !== (b.record.platform ?? null) || (sa.groupName ?? null) !== (sb.groupName ?? null)) {
    return { linked: false, evidence: [], reason: "different source group" };
  }
  const gapH = Math.abs(timeMs(a.record) - timeMs(b.record)) / 3_600_000;
  if (gapH > SERIES_WINDOW_HOURS) return { linked: false, evidence: [], reason: "too far apart in time" };
  if (a.keys.size === 0 || b.keys.size === 0) return { linked: false, evidence: [], reason: "no monitored locations" };

  const shared = [...a.keys].filter((k) => b.keys.has(k)).length;
  const union = new Set([...a.keys, ...b.keys]).size;
  const jaccard = union ? shared / union : 0;

  const ia = a.identity;
  const ib = b.identity;
  const officeMatch = Boolean(ia.officeKey && ia.officeKey === ib.officeKey);
  const officeConflict = Boolean(ia.officeKey && ib.officeKey && ia.officeKey !== ib.officeKey);
  const titleMatch = Boolean(ia.titleKey && ia.titleKey === ib.titleKey);

  if (officeConflict) return { linked: false, evidence: [], reason: "different reporting office" };

  const strongOverlap = shared >= 3 && jaccard >= 0.8;
  const linked = ((officeMatch || titleMatch) && shared >= 1 && jaccard >= 0.5) || strongOverlap;
  if (!linked) {
    return {
      linked: false,
      evidence: [],
      reason: `insufficient evidence (${shared} of ${union} locations shared${officeMatch || titleMatch ? "" : ", no matching office or title"})`,
    };
  }

  const evidence = [
    `Same source group: ${sa.groupName ?? "unnamed group"} (${platformLabel(a.record.platform)})`,
  ];
  if (officeMatch) evidence.push(`Same office: ${ia.officeLabel}`);
  if (titleMatch) evidence.push(`Same report title: ${ia.titleLabel}${ia.titleFromMessage ? " (first line of message)" : ""}`);
  evidence.push(`${shared} of ${union} monitored locations match`);
  const gap = formatGap(messageTime(a.record), messageTime(b.record));
  if (gap) evidence.push(`Reported ${gap} apart`);
  return { linked: true, evidence, reason: null };
}

function changeFor(
  key: string,
  prev: LocationObservation | null,
  cur: LocationObservation | null,
): LocationChange {
  const label = cur?.label ?? prev?.label ?? key;
  const base = { key, label, previous: prev, current: cur, deltaM: null, roadChange: null, interventionChange: null };

  if (!prev && cur) {
    return { ...base, kind: "new_location", detail: `Not listed in the previous report. Current: ${describeObservation(cur)}.` };
  }
  if (prev && !cur) {
    return {
      ...base,
      kind: "no_longer_listed",
      detail: `Listed in the previous report (${describeObservation(prev)}) but not in the current report; its current status is not reported.`,
    };
  }
  const p = prev as LocationObservation;
  const c = cur as LocationObservation;

  const roadChange =
    p.roadStatus && c.roadStatus && !sameText(p.roadStatus, c.roadStatus) ? { from: p.roadStatus, to: c.roadStatus } : null;
  const interventionChange =
    p.intervention && c.intervention && !sameText(p.intervention, c.intervention)
      ? { from: p.intervention, to: c.intervention }
      : null;
  const withExtras = { ...base, roadChange, interventionChange };

  const pf = isFlooded(p.condition);
  const cf = isFlooded(c.condition);
  const pc = isClear(p.condition);
  const cc = isClear(c.condition);

  if (pf && cc) {
    const t = formatClock(c.subsidedAt);
    const prevLevel = p.heightM !== null ? `a water level of ${formatMeters(p.heightM)}` : "flooding (water level not stated)";
    const road = p.roadStatus ? ` and the road was reported as “${p.roadStatus}”` : "";
    return {
      ...withExtras,
      kind: "subsided",
      detail: `Flooding at ${label} has subsided${t ? ` as of ${t}` : ""}. The previous report recorded ${prevLevel}${road}.`,
    };
  }
  if (pc && cf) {
    return {
      ...withExtras,
      kind: "newly_flooded",
      detail: `${label} now reports ${describeObservation(c).toLowerCase()}; the previous report stated no flooding.`,
    };
  }
  if (pf && cf) {
    if (p.heightM !== null && c.heightM !== null) {
      const delta = Math.round((c.heightM - p.heightM) * 1000) / 1000;
      if (Math.abs(delta) < 0.005) {
        return { ...withExtras, deltaM: 0, kind: "unchanged_flooded", detail: `Water level unchanged at ${formatMeters(c.heightM)}.` };
      }
      return {
        ...withExtras,
        deltaM: delta,
        kind: delta > 0 ? "level_increased" : "level_decreased",
        detail: `Water level ${delta > 0 ? "rose" : "fell"} from ${formatMeters(p.heightM)} to ${formatMeters(c.heightM)} (${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)} m).`,
      };
    }
    const which = p.heightM === null && c.heightM === null ? "either" : p.heightM === null ? "the previous" : "the current";
    return {
      ...withExtras,
      kind: "still_flooded",
      detail: `Flooding reported in both reports; the level change cannot be determined because no measured water level is stated in ${which} report.`,
    };
  }
  if (pc && cc) {
    return { ...withExtras, kind: "unchanged_clear", detail: "No flooding reported in either report." };
  }
  const which =
    p.condition === "unknown" && c.condition === "unknown" ? "either" : p.condition === "unknown" ? "the previous" : "the current";
  return {
    ...withExtras,
    kind: "not_comparable",
    detail: `Flood status is not reported in ${which} report, so no change is inferred.`,
  };
}

export function compareObservations(prev: LocationObservation[], cur: LocationObservation[]): LocationChange[] {
  const prevByKey = new Map<string, LocationObservation>();
  for (const o of prev) if (o.key && !prevByKey.has(o.key)) prevByKey.set(o.key, o);
  const seen = new Set<string>();
  const out: LocationChange[] = [];
  for (const o of cur) {
    if (!o.key || seen.has(o.key)) continue;
    seen.add(o.key);
    out.push(changeFor(o.key, prevByKey.get(o.key) ?? null, o));
  }
  for (const [key, o] of prevByKey) if (!seen.has(key)) out.push(changeFor(key, o, null));
  return out;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function computedSummary(
  cur: FloodMetrics,
  prev: FloodMetrics | null,
  changes: LocationChange[],
): string {
  const parts: string[] = [];
  if (cur.monitored === 0) return "The report lists no monitored locations.";
  if (cur.flooded === 0 && cur.unknown === 0) {
    parts.push(`All ${plural(cur.monitored, "monitored location")} report no flooding.`);
  } else {
    parts.push(
      `${cur.flooded} of ${plural(cur.monitored, "monitored location")} report flooding; ${cur.noFlooding} report no flooding${cur.unknown ? `; ${cur.unknown} not reported` : ""}.`,
    );
  }
  if (prev) {
    parts.push(`Previous report: ${prev.flooded} of ${prev.monitored} reported flooding.`);
    const count = (k: LocationChange["kind"]) => changes.filter((c) => c.kind === k).length;
    const subsided = count("subsided");
    const newly = count("newly_flooded");
    const up = count("level_increased");
    const down = count("level_decreased");
    const deltas = [
      subsided ? `flooding subsided at ${plural(subsided, "location")}` : null,
      newly ? `${plural(newly, "location")} newly flooded` : null,
      up ? `water level rose at ${plural(up, "location")}` : null,
      down ? `water level fell at ${plural(down, "location")}` : null,
    ].filter(Boolean);
    if (deltas.length) {
      const text = deltas.join(", ");
      parts.push(`${text.charAt(0).toUpperCase()}${text.slice(1)}.`);
    } else {
      parts.push("No flood-status change is determinable between the two reports.");
    }
  }
  return parts.join(" ");
}

function memberRef(record: BridgeReportRecord, currentId: string): SeriesMemberRef {
  return {
    id: record.id,
    reference: reportReference(record.id, record.createdAt),
    messageTime: messageTime(record),
    isCurrent: record.id === currentId,
  };
}

function seriesKeyFor(x: Indexed): string {
  const id = x.identity.officeKey ?? x.identity.titleKey ?? [...x.keys].sort().slice(0, 3).join(",");
  return `${x.record.platform ?? "unknown"}|${x.record.source.groupName ?? ""}|${id}`;
}

function seriesLabelFor(x: Indexed): string {
  return x.identity.titleLabel ?? x.identity.officeLabel ?? "Monitoring series";
}

export interface SeriesResult {
  comparison: SeriesComparison | null;
  note: string | null;
  /** Linked members (including the current report), oldest first. */
  members: BridgeReportRecord[];
}

/**
 * Builds the comparison for `current` against the linked report immediately
 * before it. `candidates` are reports from the same platform/group window.
 */
export function buildSeries(current: BridgeReportRecord, candidates: BridgeReportRecord[]): SeriesResult {
  const cur = index(current);
  if (cur.keys.size === 0) {
    return { comparison: null, note: "This report lists no monitored locations, so it is not part of a monitoring series.", members: [current] };
  }
  const linked: { x: Indexed; decision: LinkDecision }[] = [];
  for (const c of candidates) {
    if (c.id === current.id || !c.extraction) continue;
    const x = index(c);
    const decision = linkReports(cur, x);
    if (decision.linked) linked.push({ x, decision });
  }
  const members = [current, ...linked.map((l) => l.x.record)].sort((a, b) => timeMs(a) - timeMs(b));
  const curT = timeMs(current);
  const prevLink = linked
    .filter((l) => timeMs(l.x.record) < curT)
    .sort((a, b) => timeMs(b.x.record) - timeMs(a.x.record))[0];

  const curMetrics = floodMetrics(cur.obs);
  const changes = prevLink ? compareObservations(prevLink.x.obs, cur.obs) : [];
  const prevMetrics = prevLink ? floodMetrics(prevLink.x.obs) : null;
  const weatherCur = observeWeather(current);
  const weatherPrev = prevLink ? observeWeather(prevLink.x.record) : null;

  if (linked.length === 0) {
    return {
      comparison: null,
      note: "No earlier report from the same group shares enough evidence (office or title and monitored locations) to be treated as the same monitoring series.",
      members,
    };
  }

  const comparison: SeriesComparison = {
    seriesKey: seriesKeyFor(cur),
    seriesLabel: seriesLabelFor(cur),
    evidence: (prevLink ?? linked[0])?.decision.evidence ?? [],
    members: members.map((m) => memberRef(m, current.id)),
    current: {
      id: current.id,
      reference: reportReference(current.id, current.createdAt),
      messageTime: messageTime(current),
      metrics: curMetrics,
    },
    previous: prevLink
      ? {
          id: prevLink.x.record.id,
          reference: reportReference(prevLink.x.record.id, prevLink.x.record.createdAt),
          messageTime: messageTime(prevLink.x.record),
          metrics: prevMetrics as FloodMetrics,
        }
      : null,
    changes,
    weather: {
      previous: weatherPrev,
      current: weatherCur,
      changed: prevLink && weatherPrev && weatherCur ? !sameText(weatherPrev.text, weatherCur.text) : null,
    },
    computedSummary: computedSummary(curMetrics, prevMetrics, changes),
  };
  return {
    comparison,
    note: prevLink ? null : "This is the earliest report in its monitoring series; there is no previous report to compare.",
    members,
  };
}

/**
 * Groups reports (newest first) into monitoring series for the situation
 * view. Each series is compared latest-vs-previous. Reports that link to no
 * other report are returned as single-report series.
 */
export function clusterSeries(records: BridgeReportRecord[]): SeriesComparison[] {
  const sorted = [...records].filter((r) => r.extraction).sort((a, b) => timeMs(b) - timeMs(a));
  const used = new Set<string>();
  const out: SeriesComparison[] = [];
  for (const latest of sorted) {
    if (used.has(latest.id)) continue;
    const head = index(latest);
    if (head.keys.size === 0) continue;
    used.add(latest.id);
    const group = sorted.filter((r) => !used.has(r.id) && linkReports(head, index(r)).linked);
    for (const r of group) used.add(r.id);
    const result = buildSeries(latest, group);
    if (result.comparison) {
      out.push(result.comparison);
    } else {
      const metrics = floodMetrics(head.obs);
      out.push({
        seriesKey: seriesKeyFor(head),
        seriesLabel: seriesLabelFor(head),
        evidence: [],
        members: [memberRef(latest, latest.id)],
        current: {
          id: latest.id,
          reference: reportReference(latest.id, latest.createdAt),
          messageTime: messageTime(latest),
          metrics,
        },
        previous: null,
        changes: [],
        weather: { previous: null, current: observeWeather(latest), changed: null },
        computedSummary: computedSummary(metrics, null, []),
      });
    }
  }
  return out;
}

/** Chronological observations of one location across a series' reports. */
export function locationHistory(
  key: string,
  members: BridgeReportRecord[],
  seriesLabel: string | null,
): LocationHistory | null {
  const entries = members
    .map((record) => {
      const observation = observeReport(record).find((o) => o.key === key);
      return observation
        ? {
            reportId: record.id,
            reference: reportReference(record.id, record.createdAt),
            messageTime: messageTime(record),
            observation,
          }
        : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => Date.parse(a.messageTime ?? "") - Date.parse(b.messageTime ?? ""));
  if (!entries.length) return null;
  const latest = entries[entries.length - 1];
  return { key, label: latest ? latest.observation.label : key, seriesLabel, entries };
}
