"use client";

import { Info, MessageSquareText } from "lucide-react";
import { FLOOD_SEVERITY, floodSeverity } from "@/features/incident/lib/flood-severity";
import { cn } from "@/utils/cn";
import { MOBILE_EXPIRY_HOURS } from "../lib/expiry";
import { FLOOD_LEVELS, roadStatus } from "../lib/options";
import type { PublicFloodReport } from "../types";
import { BottomSheet } from "./bottom-sheet";
import { CLEARED_COLOR, RECEDED_COLOR } from "./flood-map";

export type LegendKey = "low" | "medium" | "high" | "receded" | "cleared";

interface LegendItem {
  key: LegendKey;
  label: string;
  color: string;
  /** Short line under the label (depth range, or what the color means). */
  range: string;
  meaning: string;
  /** Only shown in the history ranges (24h, 3d, 7d). */
  history?: boolean;
}

const rain = `${MOBILE_EXPIRY_HOURS.light_rain}–${MOBILE_EXPIRY_HOURS.heavy_rain} h`;

export const LEGEND_ITEMS: LegendItem[] = [
  ...(["low", "medium", "high"] as const).map((s) => ({
    key: s,
    label: FLOOD_SEVERITY[s].label,
    color: FLOOD_SEVERITY[s].color,
    range: FLOOD_SEVERITY[s].range,
    meaning: FLOOD_SEVERITY[s].meaning,
  })),
  {
    key: "receded",
    label: "Receded",
    color: RECEDED_COLOR,
    range: "The flood has gone down",
    meaning: "The sender (or an OKB operator) gave the time the water receded. The road is no longer reported flooded.",
    history: true,
  },
  {
    key: "cleared",
    label: "Cleared",
    color: CLEARED_COLOR,
    range: "No update; its time ran out",
    meaning: `No receded time came, so the report left the live map after a time set by the sender's weather: ${MOBILE_EXPIRY_HOURS.clear} h clear, ${MOBILE_EXPIRY_HOURS.cloudy} h cloudy, ${rain} rain.`,
    history: true,
  },
];

export function legendKeyOf(r: Pick<PublicFloodReport, "receded" | "expired" | "severity">): LegendKey | null {
  if (r.receded) return "receded";
  if (r.expired) return "cleared";
  return r.severity === "unmeasured" ? null : r.severity;
}

/** Pins from WhatsApp / Viber groups. */
const groupPins = (reports: PublicFloodReport[]) => reports.filter((r) => r.source !== "okb_mobile").length;

/** MMDA flood heights that fall in a depth level ("Gutter deep (8 in)"). */
function levelsOf(key: LegendKey): string[] {
  return FLOOD_LEVELS.filter((l) => floodSeverity(l.meters) === key).map((l) => `${l.label} (${l.inches})`);
}

/** The colors under the map; tapping it opens the legend sheet. */
export function MapLegendButton({ history, onOpen }: { history: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Map legend: what the colors mean"
      className="pointer-events-auto flex min-h-10 min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl bg-white/95 px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 shadow-md active:bg-slate-100"
    >
      <Info className="size-4 shrink-0 text-blue-600" aria-hidden />
      {LEGEND_ITEMS.filter((l) => history || !l.history).map((l) => (
        <span key={l.key} className="flex items-center gap-1">
          <span className="size-2.5 rounded-full" style={{ background: l.color }} />
          {l.label}
        </span>
      ))}
    </button>
  );
}

/** What each map color means, its flood heights and how many reports on the map have it. */
export function MapLegendSheet({
  open,
  onClose,
  reports,
  history,
}: {
  open: boolean;
  onClose: () => void;
  /** The reports on the map now. */
  reports: PublicFloodReport[];
  history: boolean;
}) {
  const count = (key: LegendKey) => reports.filter((r) => legendKeyOf(r) === key).length;
  return (
    <BottomSheet open={open} onClose={onClose} title="Map legend">
      <div className="space-y-4 pb-2">
        <p className="text-sm text-slate-600">
          Each pin is a flood report. It shows the report&apos;s first photo, the ring color is the flood level and the tag under it is the
          depth. Tap a pin to see its details and photos.
        </p>
        <ul className="space-y-2.5">
          {LEGEND_ITEMS.map((l) => {
            const n = count(l.key);
            const hidden = l.history && !history;
            const levels = levelsOf(l.key);
            return (
              <li key={l.key} className={cn("rounded-xl border border-slate-200 p-3", hidden && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 size-5 shrink-0 rounded-full ring-2 ring-white" style={{ background: l.color, boxShadow: `0 0 0 1px ${l.color}` }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <p className="font-bold text-slate-900">{l.label}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {hidden ? "In 24h, 3d, 7d" : `${n} on the map`}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-700">{l.range}</p>
                    <p className="mt-1 text-sm text-slate-600">{l.meaning}</p>
                    {levels.length ? (
                      <p className="mt-1.5 text-xs text-slate-500">
                        <span className="font-semibold text-slate-600">Flood heights: </span>
                        {levels.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
          <li className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">✓</span>
            <div>
              <p className="font-bold text-slate-900">Verified</p>
              <p className="text-sm text-slate-600">OKB operators checked the report and its photos.</p>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1fa855] text-white">
              <MessageSquareText className="size-3" aria-hidden />
            </span>
            <div>
              <p className="font-bold text-slate-900">WhatsApp / Viber report</p>
              <p className="text-sm text-slate-600">
                Sent to a flood monitoring group (green WhatsApp, violet Viber). Tap it to read the report as it was sent; a message icon
                means no photos were added yet.
              </p>
              {groupPins(reports) ? <p className="text-xs font-semibold text-slate-500">{groupPins(reports)} on the map</p> : null}
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
            <span className="mt-0.5 size-5 shrink-0 rounded-full border-[3px] border-blue-600 bg-blue-600/25" />
            <div>
              <p className="font-bold text-slate-900">You</p>
              <p className="text-sm text-slate-600">Your location, when you allow it.</p>
            </div>
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Road: {roadStatus("passable_all")?.label.toLowerCase()} up to half-knee deep; {roadStatus("not_passable_light")?.label.toLowerCase()}{" "}
          from half-tire deep; {roadStatus("not_passable_all")?.label.toLowerCase()} from tire deep (MMDA).
        </p>
      </div>
    </BottomSheet>
  );
}
