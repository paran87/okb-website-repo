"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Droplets, GitBranchPlus, History, ImageOff, MapPin, Radio, Waves, X } from "lucide-react";
import type { RecordType } from "@/features/accomplishment/lib/rollup";
import type { PublicAccomplishment } from "@/features/accomplishment/public-types";
import { ArchiveView } from "@/components/public/accomplishment-live/archive-section";
import { drainageFeed, logKind, type DrainageEntry } from "@/components/public/accomplishment-live/field-feed";
import { inPlace, norm, sameRegion, type Place } from "@/components/public/accomplishment-live/places";
import type { Selection } from "@/components/public/accomplishment-live/regions";
import { dayText, Empty, int, Meter, Panel, pctText, photoUrl, recordProgress, stampDay, StatusPill } from "@/components/public/accomplishment-live/shared";
import { cn } from "@/utils/cn";

type View = "waterway" | "drainage";
type Mode = "latest" | "archive";
const MODES: { value: Mode; label: string; icon: typeof Radio }[] = [
  { value: "latest", label: "Latest", icon: Radio },
  { value: "archive", label: "History", icon: History },
];
const DRAINAGE_PAGE = 30;

/**
 * Field updates: the Accomplishment Log (waterways) or the latest drainage declogging, each site's latest report
 * and traced-line extensions. The log view follows the type chips; both stay one tap away.
 */
export function UpdatesSection({
  data,
  types,
  records,
  onOpenWaterway,
  onOpenRecord,
  place = null,
  onClearPlace,
}: {
  data: PublicAccomplishment;
  types: RecordType[];
  /** Every record with its place (all types). */
  records: Selection[];
  onOpenWaterway: (name: string) => void;
  onOpenRecord: (sel: Selection) => void;
  /** Only the updates of this place (picked in the search box). */
  place?: Place | null;
  onClearPlace?: () => void;
}) {
  const find = useMemo(() => {
    const byName = new Map<string, Selection>();
    for (const r of records) if (!byName.has(r.record.n)) byName.set(r.record.n, r);
    return (name: string) => byName.get(name) ?? null;
  }, [records]);

  // The place filter: an entry is in the place by its record's region, site and city, else by what the entry says.
  const here = useMemo(() => {
    if (!place) return null;
    return (name: string, region?: string | null, site?: string | null) => {
      const sel = find(name);
      return (
        (sel !== null && inPlace(place, { region: sel.region, site: sel.site, city: sel.record.x?.city, name })) ||
        inPlace(place, { region, site, name })
      );
    };
  }, [place, find]);
  // Sites with records in the place, for the site reports of a city that is not a site itself.
  const placeSites = useMemo(() => {
    if (!place) return null;
    const out: { region: string; site: string }[] = [];
    for (const r of records) if (inPlace(place, { region: r.region, site: r.site, city: r.record.x?.city, name: r.record.n })) out.push({ region: r.region, site: norm(r.site) });
    return out;
  }, [place, records]);

  // Drainage lines with log entries are dated by them in the drainage view.
  const waterwayLog = useMemo(
    () => data.updates.filter((u) => logKind(u, find) !== "drainage" && (!here || here(u.waterway, u.region, u.site))),
    [data.updates, find, here],
  );
  const drainage = useMemo(() => drainageFeed(records).filter((e) => !here || here(e.record.n, e.region, e.site)), [records, here]);
  const siteReports = useMemo(
    () =>
      data.siteReports.filter(
        (s) => !place || inPlace(place, { region: s.region, site: s.site }) || (placeSites ?? []).some((p) => p.site === norm(s.site) && (!s.region || sameRegion(p.region, s.region))),
      ),
    [data.siteReports, place, placeSites],
  );
  const extensions = useMemo(() => data.extensions.filter((e) => !here || here(e.waterway, e.region, e.site)), [data.extensions, here]);
  const where = place ? (place.kind === "text" ? `mentioning “${place.label}”` : `in ${place.label}`) : "";

  const typesKey = types.join(",");
  const fallback: View = types.includes("waterway") || !types.includes("drainage") ? "waterway" : "drainage";
  const [choice, setChoice] = useState<{ key: string; view: View } | null>(null);
  const view = choice?.key === typesKey ? choice.view : fallback;
  const [shown, setShown] = useState(DRAINAGE_PAGE);
  const [mode, setMode] = useState<Mode>("latest");

  const tabs: { value: View; label: string; icon: typeof Waves; count: number }[] = [
    { value: "waterway", label: "Waterways", icon: Waves, count: waterwayLog.length },
    { value: "drainage", label: "Drainage", icon: Droplets, count: drainage.length },
  ];

  const modeSwitch = (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--dpwh-border)] bg-white p-1 sm:inline-grid sm:w-80" role="group" aria-label="Updates">
      {MODES.map(({ value, label, icon: Icon }) => {
        const on = mode === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            onClick={() => setMode(value)}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold transition-colors",
              on ? "bg-[var(--dpwh-blue-dark)] text-white shadow-[inset_0_-3px_0_var(--dpwh-orange)]" : "text-[var(--dpwh-blue-dark)] hover:bg-[var(--dpwh-blue-light)]",
            )}
          >
            <Icon className={cn("size-4", on ? "text-[var(--dpwh-gold)]" : "text-[var(--dpwh-orange)]")} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );

  const placeChip = place ? (
    <div className="flex items-center gap-2 rounded-xl border border-[#fed7aa] bg-[var(--dpwh-orange-light)] py-1 pl-3 pr-1" role="status">
      <MapPin className="size-4 shrink-0 text-[var(--dpwh-orange-dark)]" aria-hidden />
      <p className="min-w-0 flex-1 text-sm leading-snug text-[var(--dpwh-text)]">
        Updates <span className="font-bold text-[var(--dpwh-blue-dark)]">{where}</span>
        {place.kind !== "region" && place.kind !== "text" && place.region ? <span className="text-[var(--dpwh-muted)]"> · {place.region}</span> : null}
      </p>
      <button
        type="button"
        onClick={onClearPlace}
        className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-[var(--dpwh-blue-dark)] hover:bg-white"
      >
        <X className="size-4" aria-hidden /> All places
      </button>
    </div>
  ) : null;

  if (mode === "archive") {
    return (
      <div className="space-y-3">
        {placeChip}
        {modeSwitch}
        <ArchiveView types={types} records={records} onOpenRecord={onOpenRecord} place={place} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
    {placeChip}
    {modeSwitch}
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title={view === "drainage" ? "Drainage declogging" : "Accomplishment log"} icon={view === "drainage" ? Droplets : Radio} className="lg:col-span-7" bodyClassName="p-2 sm:p-3">
        <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-[#eef2f7] p-1" role="group" aria-label="Show updates of">
          {tabs.map(({ value, label, icon: Icon, count }) => {
            const on = view === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => setChoice({ key: typesKey, view: value })}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-bold transition-colors",
                  on ? "bg-white text-[var(--dpwh-blue-dark)] shadow-sm" : "text-[var(--dpwh-muted)] hover:text-[var(--dpwh-blue-dark)]",
                )}
              >
                <Icon className={cn("size-3.5", on ? "text-[var(--dpwh-orange)]" : "")} aria-hidden />
                {label}
                <span className="tabular-nums opacity-70">{int(count)}</span>
              </button>
            );
          })}
        </div>

        {view === "drainage" ? (
          drainage.length ? (
            <>
              <p className="mb-2 px-1 text-[11px] leading-snug text-[var(--dpwh-muted)]">
                Volume declogged on each drainage line as reported to the OKB Secretariat, newest field activity first (the day of its latest field photo or log entry).
              </p>
              <ol className="space-y-2">
                {drainage.slice(0, shown).map((e) => (
                  <li key={`${e.region}|${e.site}|${e.record.n}`}>
                    <DrainageCard entry={e} scale={data.scale} onOpen={() => onOpenRecord(e)} />
                  </li>
                ))}
              </ol>
              {drainage.length > shown ? (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + DRAINAGE_PAGE)}
                  className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-[var(--dpwh-border)] bg-white text-xs font-bold text-[var(--dpwh-blue)] hover:bg-[var(--dpwh-blue-light)]"
                >
                  Show more ({int(drainage.length - shown)} left)
                </button>
              ) : null}
            </>
          ) : (
            <Empty>{place ? `No drainage declogging reported ${where}.` : "No drainage declogging reported yet."}</Empty>
          )
        ) : waterwayLog.length ? (
          <ol className="space-y-2">
            {waterwayLog.map((u, i) => {
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
          <Empty>{place ? `No accomplishment log entries ${where}.` : "No entries in the accomplishment log yet."}</Empty>
        )}
      </Panel>

      <div className="space-y-4 lg:col-span-5">
        <Panel title="Latest site reports" icon={CalendarCheck} bodyClassName="p-0">
          {siteReports.length ? (
            <ul className="divide-y divide-[#eef1f5]">
              {siteReports.map((s) => (
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
              <Empty>{place ? `No site reports ${where}.` : "No site reports yet."}</Empty>
            </div>
          )}
        </Panel>

        <Panel title="Traced lines extended" icon={GitBranchPlus} bodyClassName="p-0">
          {extensions.length ? (
            <ul className="divide-y divide-[#eef1f5]">
              {extensions.slice(0, 20).map((e, i) => (
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
              <Empty>{place ? `No line extensions ${where}.` : "No line extensions yet."}</Empty>
            </div>
          )}
        </Panel>
      </div>
    </div>
    </div>
  );
}

function Thumb({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#cfd8e3] text-[var(--dpwh-muted)]">
      {failed ? (
        <ImageOff className="size-5" aria-hidden />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl(id, 160)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" />
      )}
    </span>
  );
}

function DrainageCard({ entry, scale, onOpen }: { entry: DrainageEntry; scale: PublicAccomplishment["scale"]; onOpen: () => void }) {
  const w = entry.record;
  const pct = recordProgress(w, scale);
  const photos = w.x?.ph ?? 0;
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-xl border border-[#e3e8ef] bg-[#fbfcfe] p-3 text-left hover:border-[#8fa3bf]">
      <div className="flex items-start gap-3">
        {w.x?.cv ? <Thumb id={w.x.cv} /> : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--dpwh-orange-dark)]">
                {entry.at ? dayText(entry.at) : <span className="text-[var(--dpwh-muted)]">No dated report</span>}
                {entry.via ? <span className="font-semibold normal-case tracking-normal text-[var(--dpwh-muted)]"> · {entry.via === "photo" ? "latest field photo" : "log entry"}</span> : null}
              </p>
              <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--dpwh-text)]">{w.n}</p>
              <p className="truncate text-xs text-[var(--dpwh-muted)]">{[entry.region, entry.site, w.x?.city].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-xl font-bold leading-none text-[var(--dpwh-blue-dark)]">{w.v !== null ? `${int(w.v)} m³` : "—"}</p>
              {w.p ? <p className="mt-0.5 text-[11px] text-[var(--dpwh-muted)]">of {int(w.p)} m³</p> : null}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <Meter pct={pct} className="h-1.5" label="Declogging progress" />
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--dpwh-muted)]">
          <StatusPill w={w} scale={scale} className="h-5" />
          {pct !== null ? <span className="font-bold text-[var(--dpwh-blue-dark)]">{pctText(pct, 0)}</span> : null}
          {photos ? <span>{int(photos)} field photo{photos === 1 ? "" : "s"}</span> : null}
        </div>
      </div>
    </button>
  );
}
