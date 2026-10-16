"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, ChevronDown, ChevronRight, Download, Loader2, Map as MapIcon, MapPin } from "lucide-react";
import { recordType, regionLabel, statusCounts, volumeTotals, workStatus, type VisibleRegion } from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData, AccomplishmentRecord } from "@/features/accomplishment/types";
import { useFieldPhotos } from "@/components/public/accomplishment-live/data";
import { PhotoThumb, PhotoViewer } from "@/components/public/accomplishment-live/photo-viewer";
import { downloadBlob, renderWaterwayImage } from "@/components/public/accomplishment-live/waterway-image";
import { WaterwayMap } from "@/components/public/accomplishment-live/waterway-map";
import {
  compact,
  dayText,
  Empty,
  int,
  km,
  Meter,
  pctText,
  recordProgress,
  Sheet,
  STATUS,
  STATUS_ORDER,
  StatusPill,
} from "@/components/public/accomplishment-live/shared";
import { cn } from "@/utils/cn";

type Scale = AccomplishmentData["scale"];

const TYPE_LABEL = { waterway: "Waterway", drainage: "Drainage", isf: "Informal settlers (ISF)" } as const;

export interface Selection {
  record: AccomplishmentRecord;
  region: string;
  site: string;
}

/* ----------------------------------------------------------------- region cards */

export function RegionCard({ region, scale, rank, onOpen }: { region: VisibleRegion; scale: Scale; rank: number | null; onOpen: () => void }) {
  const label = regionLabel(region);
  const volume = volumeTotals(region.ways);
  const counts = statusCounts(region.ways, scale);
  const photos = region.ways.reduce((n, w) => n + (w.x?.ph ?? 0), 0);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col gap-3 rounded-xl border border-[var(--dpwh-border)] border-t-[3px] border-t-[var(--dpwh-orange)] bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,40,85,0.08)] transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[#8fa3bf] hover:shadow-[0_8px_24px_rgba(0,40,85,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dpwh-orange)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            {rank !== null ? (
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[var(--dpwh-blue-dark)] text-[11px] font-bold text-[var(--dpwh-gold)]">{rank}</span>
            ) : null}
            <span className="truncate font-display text-xl font-bold uppercase leading-none tracking-wide text-[var(--dpwh-blue-dark)]">{label.code}</span>
          </p>
          {label.name ? <p className="mt-1 truncate text-xs text-[var(--dpwh-muted)]">{label.name}</p> : null}
        </div>
        <span className="font-display text-[1.7rem] font-bold leading-none tabular-nums text-[var(--dpwh-blue)]">{pctText(region.pct)}</span>
      </div>
      <Meter pct={region.pct} label={`${label.code} progress`} />
      <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Records by status">
        {STATUS_ORDER.filter((st) => counts[st] > 0).map((st) => {
          const Icon = STATUS[st].icon;
          return (
            <li key={st} className="flex items-center gap-1 text-xs text-[var(--dpwh-muted)]">
              <Icon className="size-3.5" style={{ color: STATUS[st].color }} aria-hidden />
              <span className="font-bold tabular-nums text-[var(--dpwh-text)]">{counts[st]}</span>
              <span>{STATUS[st].label.toLowerCase()}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t border-[#e3e8ef] pt-2.5 text-xs text-[var(--dpwh-muted)]">
        <span className="truncate">
          {region.sites.length} site{region.sites.length === 1 ? "" : "s"} · {region.ways.length} record{region.ways.length === 1 ? "" : "s"}
          {volume.plan ? ` · ${compact(volume.acc)} / ${compact(volume.plan)} m³` : ""}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {photos ? (
            <span className="flex items-center gap-1">
              <Camera className="size-3.5" aria-hidden />
              {photos}
            </span>
          ) : null}
          <ChevronRight className="size-4 text-[var(--dpwh-orange)] transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </button>
  );
}

/* ----------------------------------------------------------------- record row */

export function RecordRow({ w, scale, sub, onOpen }: { w: AccomplishmentRecord; scale: Scale; sub?: string; onOpen: () => void }) {
  const pct = recordProgress(w, scale);
  const st = STATUS[workStatus(w, scale)];
  const Icon = st.icon;
  return (
    <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f3f6fa]">
      <Icon className="size-4 shrink-0" style={{ color: st.color }} aria-label={st.label} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--dpwh-text)]">{w.n}</span>
        <span className="block truncate text-xs text-[var(--dpwh-muted)]">
          {sub ?? [w.x?.city, w.o].filter(Boolean).join(" · ")}
          {w.x?.ph ? ` · ${w.x.ph} photo${w.x.ph === 1 ? "" : "s"}` : ""}
        </span>
        <Meter pct={pct} className="mt-1.5 h-1.5 sm:hidden" />
      </span>
      <Meter pct={pct} className="hidden w-36 sm:block" />
      <span className="w-14 shrink-0 text-right font-display text-lg font-bold tabular-nums text-[var(--dpwh-blue-dark)]">{pctText(pct, 0)}</span>
    </button>
  );
}

/* ----------------------------------------------------------------- waterway detail */

function Fact({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-[#e3e8ef] bg-white px-3 py-2", wide && "col-span-2")}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--dpwh-muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-[var(--dpwh-text)]">{children}</dd>
    </div>
  );
}

export function WaterwayDetail({ sel, scale, onShowMap }: { sel: Selection; scale: Scale; onShowMap?: (name: string) => void }) {
  const { record: w, region, site } = sel;
  const x = w.x ?? {};
  const pct = recordProgress(w, scale);
  const photosQuery = useFieldPhotos(Boolean(x.ph));
  const photos = useMemo(() => (photosQuery.data ?? []).filter((p) => p.w === w.n), [photosQuery.data, w.n]);
  const [viewer, setViewer] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const traced = x.tp ? (100 * (x.cp ?? 0)) / x.tp : null;
  const captureRef = useRef<(() => HTMLCanvasElement | null) | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saveImage = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      const blob = await renderWaterwayImage({ record: w, region, site, scale, photos, map: captureRef.current?.() ?? null });
      downloadBlob(blob, `okb-${w.n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,40,85,0.08)]">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill w={w} scale={scale} />
          <span className="rounded-full bg-[var(--dpwh-blue-light)] px-2 py-0.5 text-[11px] font-bold text-[var(--dpwh-blue)]">{TYPE_LABEL[recordType(w)]}</span>
          {x.q ? <span className="rounded-full bg-[var(--dpwh-orange-light)] px-2 py-0.5 text-[11px] font-bold text-[var(--dpwh-orange-dark)]">NCR {x.q.toLowerCase()}</span> : null}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-sm text-[var(--dpwh-muted)]">
            <span className="font-display text-[2.6rem] font-bold leading-none text-[var(--dpwh-blue-dark)]">{pctText(pct)}</span>
            <span className="ml-1">accomplished</span>
          </p>
          {onShowMap && x.tp ? (
            <button
              type="button"
              onClick={() => onShowMap(w.n)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--dpwh-blue)] px-3 text-xs font-bold text-[var(--dpwh-blue)] hover:bg-[var(--dpwh-blue-light)]"
            >
              <MapIcon className="size-4" aria-hidden /> On the map
            </button>
          ) : null}
        </div>
        <Meter pct={pct} className="mt-3 h-2.5" label="Progress" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveImage}
            disabled={saving}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--dpwh-blue-dark)] px-3 text-xs font-bold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {saving ? "Preparing image…" : "Save as image"}
          </button>
          {saveError ? <span className="text-xs font-semibold text-[var(--dpwh-orange-dark)]">The image could not be created. Try again.</span> : null}
        </div>
        <p className="mt-2 text-xs text-[var(--dpwh-muted)]">
          {w.v !== null ? `${int(w.v)} m³ removed` : "No volume reported yet"}
          {w.p ? ` of ${int(w.p)} m³ planned` : ""}
          {w.lu ? ` · last field update ${dayText(w.lu)}` : ""}
        </p>
      </div>

      <WaterwayMap name={w.n} place={[x.city, site, region].filter(Boolean).join(", ")} captureRef={captureRef} />

      {x.ph ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--dpwh-blue-dark)]">
            <Camera className="size-4 text-[var(--dpwh-orange)]" aria-hidden /> Field photos · {x.ph}
          </p>
          {photosQuery.isLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: Math.min(x.ph, 8) }, (_, i) => (
                <span key={i} className="aspect-square animate-pulse rounded-lg bg-[#d7dee8]" />
              ))}
            </div>
          ) : photos.length ? (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {(showAll ? photos : photos.slice(0, 8)).map((p, i) => (
                  <PhotoThumb key={p.id} photo={p} label={false} onOpen={() => setViewer(i)} />
                ))}
              </div>
              {photos.length > 8 && !showAll ? (
                <button type="button" onClick={() => setShowAll(true)} className="mt-2 h-10 w-full rounded-lg border border-[var(--dpwh-border)] bg-white text-sm font-bold text-[var(--dpwh-blue)]">
                  Show all {photos.length} photos
                </button>
              ) : null}
            </>
          ) : (
            <Empty>Photos could not be loaded.</Empty>
          )}
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-2">
        <Fact label="Volume removed">{w.v !== null ? `${int(w.v)} m³` : "—"}</Fact>
        <Fact label="Planned volume">{w.p !== null ? `${int(w.p)} m³` : "—"}</Fact>
        {x.pvo ? <Fact label="Original plan (volume)">{int(x.pvo)} m³</Fact> : null}
        {w.al !== null || w.pl !== null ? (
          <Fact label="Length cleaned">
            {w.al !== null ? km(w.al) : "—"}
            {w.pl ? <span className="font-normal text-[var(--dpwh-muted)]"> of {km(w.pl)}</span> : null}
          </Fact>
        ) : null}
        {x.plo ? <Fact label="Original plan (length)">{km(x.plo)}</Fact> : null}
        {x.wd ? <Fact label="Width (bottom)">{x.wd} m</Fact> : null}
        {x.tp ? (
          <Fact label="Traced points cleaned" wide>
            {int(x.cp ?? 0)} of {int(x.tp)} ({pctText(traced, 0)})
            <Meter pct={traced} className="mt-1.5 h-1.5" />
          </Fact>
        ) : null}
        {w.pc !== null && w.pc !== undefined && w.pt ? (
          <Fact label="Points cleaned (last report)">
            {int(w.pc)} of {int(w.pt)}
          </Fact>
        ) : null}
        {x.ts || x.te ? (
          <Fact label="Target schedule" wide>
            {dayText(x.ts)} – {dayText(x.te)}
          </Fact>
        ) : null}
        <Fact label="Region · site" wide>
          {[region, site].filter(Boolean).join(" · ") || "—"}
        </Fact>
        {x.city ? <Fact label="City / municipality">{x.city}</Fact> : null}
        {w.o ? <Fact label="Implementing office">{w.o}</Fact> : null}
        {x.sec ? (
          <Fact label="Sector">
            {x.sec}
            {x.secT ? <span className="font-normal text-[var(--dpwh-muted)]"> · {x.secT.toLowerCase()}</span> : null}
          </Fact>
        ) : null}
        {w.lc ? <Fact label="Field log entries">{w.lc}</Fact> : null}
        {x.fr ? <Fact label="First traced">{dayText(x.fr)}</Fact> : null}
        {x.ext ? <Fact label="Line extensions">{x.ext}</Fact> : null}
      </dl>

      {viewer !== null ? <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onIndex={setViewer} /> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- region sheet */

export function RegionSheet({
  region,
  scale,
  initial,
  onClose,
  onShowMap,
}: {
  region: VisibleRegion | null;
  scale: Scale;
  initial?: Selection | null;
  onClose: () => void;
  onShowMap: (name: string) => void;
}) {
  const [selected, setSelected] = useState<Selection | null>(initial ?? null);
  const [closedSites, setClosedSites] = useState<Set<string>>(new Set());
  const label = region ? regionLabel(region) : null;
  const volume = region ? volumeTotals(region.ways) : null;

  if (!region || !label) return null;
  const toggle = (name: string) =>
    setClosedSites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <Sheet
      open
      onClose={onClose}
      title={selected ? selected.record.n : label.code}
      subtitle={
        selected ? (
          [selected.region, selected.site, selected.record.x?.city].filter(Boolean).join(" · ")
        ) : (
          <>
            {label.name ? `${label.name} · ` : ""}
            {pctText(region.pct)} · {region.sites.length} site{region.sites.length === 1 ? "" : "s"} · {region.ways.length} record
            {region.ways.length === 1 ? "" : "s"}
            {volume?.plan ? ` · ${compact(volume.acc)} of ${compact(volume.plan)} m³` : ""}
          </>
        )
      }
    >
      {selected ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-[var(--dpwh-blue)] hover:bg-white"
          >
            <ArrowLeft className="size-4" aria-hidden /> {label.code} sites
          </button>
          <WaterwayDetail sel={selected} scale={scale} onShowMap={onShowMap} />
        </div>
      ) : (
        <div className="space-y-3">
          {region.sites.map((s) => {
            const open = !closedSites.has(s.n);
            const sv = volumeTotals(s.w);
            return (
              <div key={s.n} className="overflow-hidden rounded-xl border border-[var(--dpwh-border)] bg-white">
                <button type="button" onClick={() => toggle(s.n)} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left">
                  <MapPin className="size-4 shrink-0 text-[var(--dpwh-orange)]" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-bold uppercase tracking-wide text-[var(--dpwh-blue-dark)]">{s.n}</span>
                    <span className="block text-xs text-[var(--dpwh-muted)]">
                      {s.w.length} record{s.w.length === 1 ? "" : "s"}
                      {sv.plan ? ` · ${compact(sv.acc)} / ${compact(sv.plan)} m³` : ""}
                    </span>
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums text-[var(--dpwh-blue)]">{pctText(s.pct)}</span>
                  <ChevronDown className={cn("size-4 shrink-0 text-[var(--dpwh-muted)] transition-transform", open && "rotate-180")} aria-hidden />
                </button>
                {open ? (
                  <ul className="divide-y divide-[#eef1f5] border-t border-[#e3e8ef]">
                    {s.w.map((w) => (
                      <li key={w.n}>
                        <RecordRow w={w} scale={scale} onOpen={() => setSelected({ record: w, region: label.code, site: s.n })} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

/** A single waterway in a sheet (from search, the map or the overview lists). */
export function WaterwaySheet({ sel, scale, onClose, onShowMap }: { sel: Selection | null; scale: Scale; onClose: () => void; onShowMap?: (name: string) => void }) {
  if (!sel) return null;
  return (
    <Sheet open onClose={onClose} title={sel.record.n} subtitle={[sel.region, sel.site, sel.record.x?.city].filter(Boolean).join(" · ")}>
      <WaterwayDetail sel={sel} scale={scale} onShowMap={onShowMap} />
    </Sheet>
  );
}

