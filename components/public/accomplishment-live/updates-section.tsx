"use client";

import { CalendarCheck, GitBranchPlus, Radio } from "lucide-react";
import type { PublicAccomplishment } from "@/features/accomplishment/public-types";
import { dayText, Empty, int, Meter, Panel, stampDay } from "@/components/public/accomplishment-live/shared";

/** Field updates: the Accomplishment Log, traced-line extensions and each site's latest report. */
export function UpdatesSection({ data, onOpenWaterway }: { data: PublicAccomplishment; onOpenWaterway: (name: string) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Accomplishment log" icon={Radio} className="lg:col-span-7" bodyClassName="p-2 sm:p-3">
        {data.updates.length ? (
          <ol className="space-y-2">
            {data.updates.map((u, i) => {
              const added = u.total !== null && u.previous !== null ? u.total - u.previous : u.mode === "by" ? u.volume : null;
              const points = u.pointsTotal ? (100 * (u.pointsCleaned ?? 0)) / u.pointsTotal : null;
              return (
                <li key={`${u.at}-${u.waterway}-${i}`}>
                  <button type="button" onClick={() => onOpenWaterway(u.waterway)} className="w-full rounded-xl border border-[#e3e8ef] bg-[#fbfcfe] p-3 text-left hover:border-[#8fa3bf]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--dpwh-orange-dark)]">{stampDay(u.at)}</p>
                        <p className="truncate text-sm font-bold text-[var(--dpwh-text)]">{u.waterway}</p>
                        <p className="truncate text-xs text-[var(--dpwh-muted)]">{[u.region, u.site, u.type].filter(Boolean).join(" · ")}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-xl font-bold leading-none text-[var(--dpwh-blue-dark)]">{u.total !== null ? `${int(u.total)} m³` : "—"}</p>
                        {added !== null && added !== 0 ? (
                          <p className="mt-0.5 text-xs font-bold text-[#15803d]">
                            {added > 0 ? "+" : ""}
                            {int(added)} m³
                          </p>
                        ) : null}
                        {u.planned ? <p className="text-[11px] text-[var(--dpwh-muted)]">of {int(u.planned)} m³</p> : null}
                      </div>
                    </div>
                    {points !== null ? (
                      <div className="mt-2">
                        <Meter pct={points} className="h-1.5" label="Points cleaned" />
                        <p className="mt-1 text-[11px] text-[var(--dpwh-muted)]">
                          {int(u.pointsCleaned ?? 0)} of {int(u.pointsTotal ?? 0)} points cleaned
                          {u.segmentsTotal ? ` · ${int(u.segmentsCleaned ?? 0)} of ${int(u.segmentsTotal)} segments` : ""}
                        </p>
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <Empty>No entries in the accomplishment log yet.</Empty>
        )}
      </Panel>

      <div className="space-y-4 lg:col-span-5">
        <Panel title="Latest site reports" icon={CalendarCheck} bodyClassName="p-0">
          {data.siteReports.length ? (
            <ul className="divide-y divide-[#eef1f5]">
              {data.siteReports.map((s) => (
                <li key={s.site} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--dpwh-text)]">{s.site}</span>
                    {s.region ? <span className="block text-xs text-[var(--dpwh-muted)]">{s.region}</span> : null}
                  </span>
                  <span className="shrink-0 rounded-md bg-[var(--dpwh-blue-light)] px-2 py-1 text-xs font-bold text-[var(--dpwh-blue-dark)]">{dayText(s.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <Empty>No site reports yet.</Empty>
            </div>
          )}
        </Panel>

        <Panel title="Traced lines extended" icon={GitBranchPlus} bodyClassName="p-0">
          {data.extensions.length ? (
            <ul className="divide-y divide-[#eef1f5]">
              {data.extensions.slice(0, 20).map((e, i) => (
                <li key={`${e.at}-${i}`}>
                  <button type="button" onClick={() => onOpenWaterway(e.waterway)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-[#f3f6fa]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--dpwh-text)]">{e.waterway}</span>
                      <span className="block truncate text-xs text-[var(--dpwh-muted)]">
                        {[e.region, e.site].filter(Boolean).join(" · ")} · {stampDay(e.at)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-[var(--dpwh-muted)]">
                      <span className="block font-bold text-[var(--dpwh-blue-dark)]">+{int(e.points ?? 0)} points</span>
                      {e.no ? `extension ${e.no}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <Empty>No line extensions yet.</Empty>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
