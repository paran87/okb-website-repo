"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronsDown, ChevronsUp, FileDown, CalendarClock, Camera, Compass, Gauge, ListChecks, Radio, Trophy } from "lucide-react";
import { regionLabel, statusCounts, workStatus, type Prefs, rollup, type VisibleRegion } from "@/features/accomplishment/lib/rollup";
import type { PublicAccomplishment } from "@/features/accomplishment/public-types";
import type { AccomplishmentRecord } from "@/features/accomplishment/types";
import { RegionDropdown } from "@/components/public/accomplishment-live/region-dropdown";
import { printRegionsPdf } from "@/components/public/accomplishment-live/region-pdf";
import { RegionSortToggle, type RegionSort } from "@/components/public/accomplishment-live/picker";
import { PhotoThumb } from "@/components/public/accomplishment-live/photo-viewer";
import type { Selection } from "@/components/public/accomplishment-live/regions";
import { dayText, Empty, int, Meter, Panel, pctText, recordProgress, STATUS, STATUS_ORDER, stampDay } from "@/components/public/accomplishment-live/shared";

export type SectionId = "overview" | "regions" | "map" | "photos" | "updates" | "resources";

interface Located extends Selection {
  regionKey: string;
}

const QUADRANTS = ["NORTH", "SOUTH", "EAST", "WEST", "CENTRAL"] as const;

function todayIso(): string {
  return new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
}

export function Overview({
  data,
  tree,
  prefs,
  onOpenRecord,
  onShowMap,
  onGo,
  onOpenPhoto,
  regionSort,
  onRegionSort,
}: {
  data: PublicAccomplishment;
  tree: VisibleRegion[];
  prefs: Prefs;
  onOpenRecord: (sel: Selection) => void;
  onShowMap: (name: string) => void;
  onGo: (section: SectionId) => void;
  onOpenPhoto: (index: number) => void;
  regionSort: RegionSort;
  onRegionSort: (v: RegionSort) => void;
}) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const toggleRegion = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const located = useMemo<Located[]>(
    () => tree.flatMap((r) => r.sites.flatMap((s) => s.w.map((w) => ({ record: w, region: regionLabel(r).code, site: s.n, regionKey: r.key })))),
    [tree],
  );
  const ways = useMemo(() => located.map((l) => l.record), [located]);
  const counts = statusCounts(ways, data.scale);
  const total = ways.length || 1;

  const byRegion = useMemo(
    () => {
      const list = [...tree].filter((r) => regionLabel(r).code !== "Other");
      return regionSort === "order" ? list : list.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    },
    [tree, regionSort],
  );
  const topVolume = useMemo(() => [...located].filter((l) => (l.record.v ?? 0) > 0).sort((a, b) => (b.record.v ?? 0) - (a.record.v ?? 0)).slice(0, 6), [located]);
  const maxVolume = topVolume[0]?.record.v ?? 1;

  const today = todayIso();
  /** Target end dates ahead (soonest first); when none are ahead, the latest ones (newest first). */
  const schedule = useMemo(() => {
    const dated = located.filter((l) => l.record.x?.te);
    const ahead = dated.filter((l) => l.record.x!.te! >= today).sort((a, b) => (a.record.x!.te! < b.record.x!.te! ? -1 : 1));
    if (ahead.length) return { ahead: true, rows: ahead.slice(0, 6) };
    return { ahead: false, rows: dated.sort((a, b) => (a.record.x!.te! > b.record.x!.te! ? -1 : 1)).slice(0, 6) };
  }, [located, today]);
  const completedRecently = useMemo(() => located.filter((l) => workStatus(l.record, data.scale) === "done").length, [located, data.scale]);

  const quadrants = useMemo(() => {
    const groups = new Map<string, AccomplishmentRecord[]>();
    for (const l of located) {
      const q = l.record.x?.q;
      if (!q) continue;
      groups.set(q, [...(groups.get(q) ?? []), l.record]);
    }
    return QUADRANTS.filter((q) => groups.has(q)).map((q) => ({ q, ways: groups.get(q)!, pct: rollup(groups.get(q)!, prefs, data.scale) }));
  }, [located, prefs, data.scale]);

  const RowLink = ({ l, right, sub }: { l: Located; right: React.ReactNode; sub: string }) => (
    <button type="button" onClick={() => onOpenRecord(l)} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#f3f6fa]">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--dpwh-text)]">{l.record.n}</span>
        <span className="block truncate text-xs text-[var(--dpwh-muted)]">{sub}</span>
      </span>
      {right}
    </button>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* Progress by region */}
      <Panel title={regionSort === "order" ? "Regions, CAR to XIII" : "Progress by region"} icon={Gauge} action={<RegionSortToggle value={regionSort} onChange={onRegionSort} />} className="lg:col-span-7" bodyClassName="p-2 sm:p-3">
        {byRegion.length ? (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-[#e3e8ef] px-1 pb-2">
            <button type="button" onClick={() => setOpenKeys(new Set(byRegion.map((r) => r.key)))} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--dpwh-border)] px-3 text-xs font-bold text-[var(--dpwh-blue-dark)] hover:border-[var(--dpwh-blue)]">
              <ChevronsDown className="size-4" aria-hidden /> Open all
            </button>
            <button type="button" onClick={() => setOpenKeys(new Set())} disabled={!openKeys.size} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--dpwh-border)] px-3 text-xs font-bold text-[var(--dpwh-blue-dark)] hover:border-[var(--dpwh-blue)] disabled:opacity-40">
              <ChevronsUp className="size-4" aria-hidden /> Close all
            </button>
            <button type="button" onClick={() => printRegionsPdf(byRegion, data.scale, prefs.types)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--dpwh-blue-dark)] px-3 text-xs font-bold text-white sm:ml-auto">
              <FileDown className="size-4" aria-hidden /> All regions PDF
            </button>
          </div>
        ) : null}
        {byRegion.length ? (
          <ol className="space-y-0.5">
            {byRegion.map((r, i) => {
              const label = regionLabel(r);
              return (
                <li key={r.key}>
                  <button type="button" aria-expanded={openKeys.has(r.key)} onClick={() => toggleRegion(r.key)} className="group flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-[#f3f6fa]">
                    <span className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-[var(--dpwh-muted)]">{i + 1}</span>
                    <span className="w-[5.5rem] shrink-0 sm:w-28">
                      <span className="block truncate font-display text-base font-bold uppercase leading-tight tracking-wide text-[var(--dpwh-blue-dark)]">{label.code}</span>
                      <span className="block truncate text-[10px] text-[var(--dpwh-muted)]">
                        {r.ways.length} record{r.ways.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <Meter pct={r.pct} className="h-3 flex-1" label={`${label.code} progress`} />
                    <span className="w-14 shrink-0 text-right font-display text-lg font-bold tabular-nums text-[var(--dpwh-blue-dark)]">{pctText(r.pct, 0)}</span>
                    <ChevronDown className={`size-4 shrink-0 text-[var(--dpwh-muted)] transition-transform ${openKeys.has(r.key) ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                  {openKeys.has(r.key) ? <RegionDropdown region={r} scale={data.scale} types={prefs.types} onMap={onShowMap} onInfo={onOpenRecord} /> : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <Empty>No records with these settings.</Empty>
        )}
      </Panel>

      {/* Status */}
      <Panel title="Status of records" icon={ListChecks} className="lg:col-span-5">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-[#e3e8ef]" role="img" aria-label={STATUS_ORDER.map((s) => `${counts[s]} ${STATUS[s].label}`).join(", ")}>
          {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
            <span key={s} className="h-full border-r-2 border-white last:border-r-0" style={{ width: `${(100 * counts[s]) / total}%`, backgroundColor: STATUS[s].color }} />
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {STATUS_ORDER.map((s) => {
            const Icon = STATUS[s].icon;
            return (
              <li key={s} className="rounded-lg border border-[#e3e8ef] px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: STATUS[s].color }}>
                  <Icon className="size-4" aria-hidden />
                  {STATUS[s].label}
                </span>
                <span className="mt-0.5 block font-display text-2xl font-bold leading-none text-[var(--dpwh-blue-dark)]">
                  {counts[s]}
                  <span className="ml-1 text-xs font-normal text-[var(--dpwh-muted)]">{Math.round((100 * counts[s]) / total)}%</span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-[var(--dpwh-muted)]">
          {`${completedRecently} of ${ways.length} records are completed. `}Status comes from each office&apos;s report, else from the volumes.
        </p>
      </Panel>

      {/* Most volume removed */}
      <Panel title="Most silt removed" icon={Trophy} className="lg:col-span-6" bodyClassName="p-2 sm:p-3">
        {topVolume.length ? (
          <ol className="space-y-1">
            {topVolume.map((l, i) => (
              <li key={`${l.site}|${l.record.n}`} className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--dpwh-blue-dark)] text-xs font-bold text-[var(--dpwh-gold)]">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <RowLink
                    l={l}
                    sub={`${l.region} · ${l.site}`}
                    right={<span className="shrink-0 text-right font-display text-lg font-bold tabular-nums text-[var(--dpwh-blue-dark)]">{int(l.record.v ?? 0)} m³</span>}
                  />
                  <span className="mx-2 -mt-1 block h-1 overflow-hidden rounded-full bg-[#e3e8ef]">
                    <span className="block h-full rounded-full bg-[var(--dpwh-orange)]" style={{ width: `${(100 * (l.record.v ?? 0)) / maxVolume}%` }} />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>No volumes reported yet.</Empty>
        )}
      </Panel>

      {/* Target schedule */}
      <Panel title={schedule.ahead ? "Target completions ahead" : "Target schedule"} icon={CalendarClock} className="lg:col-span-6" bodyClassName="p-2 sm:p-3">
        {schedule.rows.length ? (
          <ul className="space-y-0.5">
            {schedule.rows.map((l) => (
              <li key={`${l.site}|${l.record.n}`}>
                <RowLink
                  l={l}
                  sub={`${l.region} · ${l.site} · ${pctText(recordProgress(l.record, data.scale), 0)} done`}
                  right={
                    <span className="shrink-0 rounded-lg bg-[var(--dpwh-orange-light)] px-2 py-1 text-center">
                      <span className="block text-[10px] font-bold uppercase text-[var(--dpwh-orange-dark)]">Target end</span>
                      <span className="block text-xs font-bold text-[var(--dpwh-text)]">{dayText(l.record.x?.te)}</span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No target dates for these records.</Empty>
        )}
      </Panel>

      {/* NCR quadrants */}
      {quadrants.length ? (
        <Panel title="Metro Manila by quadrant" icon={Compass} className="lg:col-span-12">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {quadrants.map(({ q, ways: qw, pct }) => (
              <li key={q} className="rounded-xl border border-[#e3e8ef] bg-[#f7f9fc] p-3">
                <p className="font-display text-lg font-bold uppercase tracking-wide text-[var(--dpwh-blue-dark)]">{q.toLowerCase()}</p>
                <p className="font-display text-3xl font-bold leading-none text-[var(--dpwh-blue)]">{pctText(pct, 0)}</p>
                <Meter pct={pct} className="mt-2 h-1.5" />
                <p className="mt-1.5 text-[11px] text-[var(--dpwh-muted)]">{qw.length} waterways</p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* Latest photos */}
      <Panel
        title="Latest from the field"
        icon={Camera}
        className="lg:col-span-7"
        action={
          <button type="button" onClick={() => onGo("photos")} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[var(--dpwh-blue)] hover:bg-[var(--dpwh-blue-light)]">
            All {int(data.photos.total)} <ArrowRight className="size-3.5" aria-hidden />
          </button>
        }
      >
        {data.photos.latest.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {data.photos.latest.slice(0, 8).map((p, i) => (
              <PhotoThumb key={p.id} photo={p} onOpen={() => onOpenPhoto(i)} className={i >= 6 ? "hidden sm:block" : undefined} />
            ))}
          </div>
        ) : (
          <Empty>No field photos yet.</Empty>
        )}
      </Panel>

      {/* Latest updates */}
      <Panel
        title="Field updates"
        icon={Radio}
        className="lg:col-span-5"
        bodyClassName="p-2 sm:p-3"
        action={
          <button type="button" onClick={() => onGo("updates")} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[var(--dpwh-blue)] hover:bg-[var(--dpwh-blue-light)]">
            All <ArrowRight className="size-3.5" aria-hidden />
          </button>
        }
      >
        {data.updates.length || data.siteReports.length ? (
          <ul className="space-y-1">
            {data.updates.slice(0, 3).map((u, i) => (
              <li key={`${u.at}-${i}`} className="rounded-lg px-2 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--dpwh-orange-dark)]">{stampDay(u.at)}</p>
                <p className="truncate text-sm font-semibold text-[var(--dpwh-text)]">{u.waterway}</p>
                <p className="truncate text-xs text-[var(--dpwh-muted)]">
                  {[u.region, u.site].filter(Boolean).join(" · ")}
                  {u.total !== null ? ` · now ${int(u.total)} m³` : ""}
                </p>
              </li>
            ))}
            {data.siteReports.slice(0, Math.max(0, 4 - Math.min(3, data.updates.length))).map((s) => (
              <li key={s.site} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--dpwh-text)]">{s.site}</span>
                  <span className="block text-xs text-[var(--dpwh-muted)]">Site report{s.region ? ` · ${s.region}` : ""}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-[var(--dpwh-blue-dark)]">{dayText(s.date, true)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No field updates logged yet.</Empty>
        )}
      </Panel>
    </div>
  );
}
