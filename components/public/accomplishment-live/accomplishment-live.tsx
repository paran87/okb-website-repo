"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Camera,
  Droplets,
  HardHat,
  Home,
  LayoutGrid,
  Map as MapIcon,
  Radio,
  RefreshCw,
  Ruler,
  Shovel,
  Truck,
  Waves,
  type LucideIcon,
} from "lucide-react";
import {
  DEFAULT_PREFS,
  recordType,
  regionLabel,
  rollup,
  statusCounts,
  visibleTree,
  volumeTotals,
  type Prefs,
  type RecordType,
  type RollupMode,
} from "@/features/accomplishment/lib/rollup";
import type { PublicAccomplishment } from "@/features/accomplishment/public-types";
import { useAccomplishment } from "@/components/public/accomplishment-live/data";
import { InsightView, type InsightKind } from "@/components/public/accomplishment-live/insight";
import { MapSection } from "@/components/public/accomplishment-live/map-section";
import { Overview, type SectionId } from "@/components/public/accomplishment-live/overview";
import { PhotoViewer } from "@/components/public/accomplishment-live/photo-viewer";
import { WaterwayPicker, RegionSortToggle, type RegionSort } from "@/components/public/accomplishment-live/picker";
import { PhotosSection } from "@/components/public/accomplishment-live/photos-section";
import { RegionCard, RegionSheet, WaterwaySheet, type Selection } from "@/components/public/accomplishment-live/regions";
import { ResourcesSection } from "@/components/public/accomplishment-live/resources-section";
import { compact, Empty, int, km, Meter, ProgressRing, stampText } from "@/components/public/accomplishment-live/shared";
import { UpdatesSection } from "@/components/public/accomplishment-live/updates-section";
import { cn } from "@/utils/cn";

const PREFS_KEY = "okb.public-accomplishment.prefs";
const SORT_KEY = "okb.public-accomplishment.region-sort";

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "regions", label: "Regions", icon: LayoutGrid },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "updates", label: "Updates", icon: Radio },
  { id: "resources", label: "Resources", icon: HardHat },
];

const TYPES: { value: RecordType; label: string; icon: LucideIcon }[] = [
  { value: "waterway", label: "Waterways", icon: Waves },
  { value: "drainage", label: "Drainage", icon: Droplets },
  { value: "isf", label: "ISF", icon: Home },
];

function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<Prefs> | null;
    if (!saved) return DEFAULT_PREFS;
    const types = (saved.types ?? []).filter((t): t is RecordType => ["waterway", "drainage", "isf"].includes(t));
    return { ...DEFAULT_PREFS, mode: saved.mode === "wtd" ? "wtd" : "avg", types: types.length ? types : DEFAULT_PREFS.types };
  } catch {
    return DEFAULT_PREFS;
  }
}

function Tile({ icon: Icon, label, value, unit, hint, pct, extra, open, onOpen, cue }: { onOpen?: () => void; /** What tapping the tile shows (read by screen readers). */ cue?: string; icon: LucideIcon; label: string; value: string; unit?: string; hint?: string; pct?: number | null; /** Hidden on phones until the figures are expanded. */ extra?: boolean; open?: boolean }) {
  const Wrapper = (onOpen ? "button" : "div") as "button";
  const wrapperProps = onOpen ? { type: "button" as const, onClick: onOpen, "aria-label": `${label}: ${value}${unit ? ` ${unit}` : ""}${cue ? `. ${cue}` : ""}` } : {};
  return (
    <Wrapper {...wrapperProps} className={cn("okb-live-tile relative block w-full min-w-0 rounded-xl text-left border border-white/12 bg-white/[0.07] px-2.5 py-2 backdrop-blur-sm sm:px-3 sm:py-2.5", extra && !open && "max-sm:hidden", onOpen && "cursor-pointer transition-colors hover:border-white/40 hover:bg-white/[0.13] focus-visible:outline-2 focus-visible:outline-[var(--dpwh-gold)]")}>
      {onOpen ? <ChevronRight className="absolute right-2 top-2 size-4 text-white/55" aria-hidden /> : null}
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--dpwh-gold)]">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 truncate font-display text-[1.45rem] font-bold leading-none text-white sm:text-[1.65rem]">
        {value}
        {unit ? <span className="ml-1 text-sm font-semibold text-white/70">{unit}</span> : null}
      </p>
      {pct !== undefined ? <Meter pct={pct} tone="light" className="mt-1.5 h-1" /> : null}
      {hint ? <p className={cn("mt-1 truncate text-[10.5px] text-white/70", !open && "max-sm:hidden")}>{hint}</p> : null}
    </Wrapper>
  );
}

function Loading() {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <div className="okb-live-band rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="mx-auto size-[148px] animate-pulse rounded-full bg-white/10 sm:mx-0" />
          <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="h-24 animate-pulse rounded-xl bg-white/10" />
            ))}
          </div>
        </div>
      </div>
      <p className="text-center text-sm text-[var(--dpwh-muted)]">Reading the OKB Single Source of Truth…</p>
    </div>
  );
}

/** The public Accomplishment dashboard, read live from the OKB SSOT sheet. */
export function AccomplishmentLive() {
  const query = useAccomplishment();
  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) {
    return (
      <div className="rounded-xl border border-[var(--dpwh-border)] bg-white p-6 text-center">
        <AlertTriangle className="mx-auto size-8 text-[var(--dpwh-orange)]" aria-hidden />
        <p className="mt-2 font-display text-xl font-bold uppercase text-[var(--dpwh-blue-dark)]">The dashboard could not be loaded</p>
        <p className="mt-1 text-sm text-[var(--dpwh-muted)]">{query.error?.message ?? "Try again in a moment."}</p>
        <button type="button" onClick={() => query.refetch()} className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--dpwh-blue-dark)] px-5 text-sm font-bold text-white">
          <RefreshCw className="size-4" aria-hidden /> Try again
        </button>
      </div>
    );
  }
  return <Dashboard data={query.data} />;
}

function Dashboard({ data }: { data: PublicAccomplishment }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [section, setSection] = useState<SectionId>("overview");
  const [openRegion, setOpenRegion] = useState<{ key: string; initial: Selection | null } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mapFocus, setMapFocus] = useState<{ name: string; id: number } | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [regionSort, setRegionSortState] = useState<RegionSort>("progress");
  const navRef = useRef<HTMLDivElement>(null);
  // On phones the section bar is pinned to the bottom: it slips away while scrolling down and returns on scrolling up.
  const [figuresOpen, setFiguresOpen] = useState(false);
  const [insight, setInsight] = useState<InsightKind | null>(null);
  const [navHidden, setNavHidden] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), { threshold: 0, rootMargin: "0px 0px -80px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last;
      if (Math.abs(delta) < 8) return;
      setNavHidden(delta > 0 && y > 120);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setPrefs(loadPrefs());
    try {
      if (localStorage.getItem(SORT_KEY) === "order") setRegionSortState("order");
    } catch {
      /* private mode */
    }
  }, []);
  const setRegionSort = (v: RegionSort) => {
    setRegionSortState(v);
    try {
      localStorage.setItem(SORT_KEY, v);
    } catch {
      /* private mode */
    }
  };
  const update = (patch: Partial<Prefs>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ mode: next.mode, types: next.types }));
      } catch {
        /* private mode */
      }
      return next;
    });

  const tree = useMemo(() => visibleTree(data, prefs, ""), [data, prefs]);
  const ways = useMemo(() => tree.flatMap((r) => r.ways), [tree]);
  const overall = useMemo(() => rollup(ways, prefs, data.scale), [ways, prefs, data.scale]);
  const volume = useMemo(() => volumeTotals(ways), [ways]);
  const counts = useMemo(() => statusCounts(ways, data.scale), [ways, data.scale]);
  const length = useMemo(() => ways.reduce((a, w) => ({ done: a.done + Math.max(0, w.al ?? 0), plan: a.plan + Math.max(0, w.pl ?? 0) }), { done: 0, plan: 0 }), [ways]);
  const sites = tree.reduce((n, r) => n + r.sites.length, 0);

  /** Every record with its place, for search and lookups by name (all types, not just the filter). */
  const allTree = useMemo(() => visibleTree(data, { ...prefs, types: ["waterway", "drainage", "isf"], filter: "all" }, ""), [data, prefs]);
  const located = useMemo(
    () => allTree.flatMap((r) => r.sites.flatMap((s) => s.w.map((w) => ({ record: w, region: regionLabel(r).code, site: s.n, regionKey: r.key })))),
    [allTree],
  );
  const findByName = (name: string): Selection | null => located.find((l) => l.record.n === name) ?? null;


  const typeCounts = useMemo(() => {
    const c = { waterway: 0, drainage: 0, isf: 0 };
    for (const l of located) c[recordType(l.record)]++;
    return c;
  }, [located]);

  const go = (next: SectionId) => {
    setSection(next);
    setInsight(null);
    navRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const openInsight = (kind: InsightKind) => {
    setSection("overview");
    setInsight(kind);
    navRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const showOnMap = (name: string) => {
    setOpenRegion(null);
    setSelection(null);
    setMapFocus({ name, id: Date.now() });
    go("map");
  };
  const openWaterway = (name: string) => {
    const sel = findByName(name);
    if (sel) setSelection(sel);
  };

  const toggleType = (t: RecordType) => {
    const has = prefs.types.includes(t);
    if (has && prefs.types.length === 1) return;
    update({ types: has ? prefs.types.filter((x) => x !== t) : [...prefs.types, t] });
  };

  const regionsSorted = useMemo(() => {
    const other = (r: (typeof tree)[number]) => (regionLabel(r).code === "Other" ? 1 : 0);
    if (regionSort === "order") return [...tree].sort((a, b) => other(a) - other(b));
    return [...tree].sort((a, b) => other(a) - other(b) || (b.pct ?? -1) - (a.pct ?? -1));
  }, [tree, regionSort]);
  const regionOpen = openRegion ? (tree.find((r) => r.key === openRegion.key) ?? null) : null;

  return (
    <div ref={rootRef} className="okb-live space-y-3 pb-20 sm:pb-0">
      {/* Headline band */}
      <section aria-label="Program totals" className="okb-live-band relative isolate overflow-hidden rounded-2xl p-3 text-white sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center gap-4 lg:flex-col lg:items-center lg:text-center">
            <ProgressRing size={112} pct={overall} caption={prefs.mode === "wtd" ? "by volume" : "average progress"} />
            <div className="min-w-0 lg:w-48">
              <p className="font-display text-lg font-bold uppercase leading-tight tracking-wide sm:text-xl">Oplan Kontra Baha</p>
              <p className="mt-1 text-xs text-white/75">
                Dredging, desilting and declogging · {tree.length} regions · {sites} sites · {int(ways.length)} records
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/80">
                <span className="okb-live-dot shrink-0" aria-hidden />
                <span className="font-extrabold uppercase tracking-[0.12em] text-[#86efac]">Live</span>
                <span className="min-w-0">
                  · updated <span className="font-semibold text-white">{stampText(data.generatedAt)}</span>
                </span>
              </p>
              <div className="mt-2 flex rounded-lg bg-white/10 p-0.5 text-[11px] font-bold" role="group" aria-label="Progress measure">
                {(
                  [
                    { value: "avg", label: "Average" },
                    { value: "wtd", label: "By volume" },
                  ] as { value: RollupMode; label: string }[]
                ).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={prefs.mode === o.value}
                    onClick={() => update({ mode: o.value })}
                    className={cn("h-8 flex-1 rounded-md px-2 transition-colors", prefs.mode === o.value ? "bg-white text-[var(--dpwh-blue-dark)]" : "text-white/80 hover:text-white")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
          <div className="grid flex-1 grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-4">
            <Tile open={figuresOpen} icon={Shovel} label="Silt removed" onOpen={() => openInsight("volume")} cue="Shows silt removed by region and waterway" value={compact(volume.acc)} unit="m³" pct={volume.plan ? (100 * volume.acc) / volume.plan : null} hint={volume.plan ? `of ${compact(volume.plan)} m³ planned` : undefined} />
            <Tile open={figuresOpen} icon={Ruler} label="Length cleaned" onOpen={() => go("map")} cue="Opens the map of cleaned and not yet cleaned stretches" value={km(length.done).replace(/ (k?m)$/, "")} unit={km(length.done).endsWith("km") ? "km" : "m"} pct={length.plan ? (100 * length.done) / length.plan : null} hint={length.plan ? `of ${km(length.plan)} planned` : undefined} />
            <Tile open={figuresOpen} icon={BarChart3} label="Completed" onOpen={() => openInsight("status")} cue="Lists records by status" value={int(counts.done)} unit={`/ ${int(ways.length)}`} pct={ways.length ? (100 * counts.done) / ways.length : null} hint={`${int(counts.ongoing)} ongoing`} />
            <Tile open={figuresOpen} icon={Waves} label="Records" onOpen={() => openInsight("records")} cue="Lists every record" value={int(typeCounts.waterway)} unit="waterways" hint={`${int(typeCounts.drainage)} drainage · ${int(typeCounts.isf)} ISF`} />
            <Tile open={figuresOpen} icon={MapIcon} label="Points cleaned" onOpen={() => go("map")} cue="Opens the map" extra value={compact(data.coordinates.cleaned)} unit={`/ ${compact(data.coordinates.points)}`} pct={data.coordinates.points ? (100 * data.coordinates.cleaned) / data.coordinates.points : null} hint={`${int(data.coordinates.waterways)} waterways traced`} />
            <Tile open={figuresOpen} icon={Camera} label="Field photos" onOpen={() => go("photos")} cue="Opens the field photos" extra value={int(data.photos.total)} hint={`${int(data.photos.waterways)} waterways documented`} />
            <Tile open={figuresOpen} icon={Truck} label="Equipment" onOpen={() => go("resources")} cue="Opens equipment and crews" extra value={int(data.resources.equipment)} unit="units" hint={`${data.resources.sites.length} sites reporting`} />
            <Tile open={figuresOpen} icon={HardHat} label="Manpower" onOpen={() => go("resources")} cue="Opens equipment and crews" extra value={int(data.resources.manpower)} unit="crew" hint="RO/DEO, LGU and private" />
          </div>
            <button
              type="button"
              onClick={() => setFiguresOpen((v) => !v)}
              aria-expanded={figuresOpen}
              className="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 text-xs font-bold text-white sm:hidden"
            >
              {figuresOpen ? "Show fewer figures" : "Show all figures"}
              <ChevronDown className={cn("size-4 transition-transform", figuresOpen && "rotate-180")} aria-hidden />
            </button>
          </div>
        </div>
      </section>

      {/* Sections */}
      <div ref={navRef} className="scroll-mt-28">
        <nav
          aria-label="Dashboard sections"
          className={cn(
            "grid grid-cols-6 gap-1 rounded-xl border border-[var(--dpwh-border)] bg-white p-1",
            "max-sm:fixed max-sm:inset-x-2 max-sm:bottom-[max(0.5rem,env(safe-area-inset-bottom))] max-sm:z-40 max-sm:shadow-[0_8px_28px_rgba(0,40,85,0.35)] max-sm:transition-transform max-sm:duration-300",
            (navHidden || !inView) && "max-sm:translate-y-[160%]",
          )}
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[10.5px] font-bold leading-none transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-[13px]",
                  active ? "bg-[var(--dpwh-blue-dark)] text-white shadow-[inset_0_-3px_0_var(--dpwh-orange)]" : "text-[var(--dpwh-blue-dark)] hover:bg-[var(--dpwh-blue-light)]",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-[var(--dpwh-gold)]" : "text-[var(--dpwh-orange)]")} aria-hidden />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <WaterwayPicker
          items={located}
          types={prefs.types}
          scale={data.scale}
          onInfo={(it) => {
            setOpenRegion(null);
            setSelection(it);
          }}
        />
        <div className="grid grid-cols-3 gap-1.5 md:flex" role="group" aria-label="Record types">
            {TYPES.map(({ value, label, icon: Icon }) => {
              const on = prefs.types.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleType(value)}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-bold transition-colors",
                    on ? "border-[var(--dpwh-blue)] bg-[var(--dpwh-blue)] text-white" : "border-[var(--dpwh-border)] bg-white text-[var(--dpwh-muted)] hover:text-[var(--dpwh-blue-dark)]",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                  <span className="tabular-nums opacity-80">{typeCounts[value]}</span>
                </button>
              );
            })}
        </div>
      </div>

      {insight ? (
        <InsightView kind={insight} chipTree={tree} allTree={allTree} scale={data.scale} onBack={() => setInsight(null)} onOpen={(sel) => setSelection(sel)} />
      ) : section === "overview" ? (
        <Overview
          data={data}
          tree={tree}
          prefs={prefs}
          onOpenRecord={setSelection}
          onGo={go}
          onOpenPhoto={setPhotoIndex}
          regionSort={regionSort}
          onRegionSort={setRegionSort}
        />
      ) : section === "regions" ? (
        regionsSorted.length ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--dpwh-muted)]">{regionSort === "order" ? "Regions from CAR to Region XIII" : "Regions ranked by progress"}</p>
              <RegionSortToggle value={regionSort} onChange={setRegionSort} />
            </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {regionsSorted.map((r, i) => (
              <RegionCard key={r.key} region={r} scale={data.scale} rank={regionLabel(r).code === "Other" || regionSort === "order" ? null : i + 1} onOpen={() => setOpenRegion({ key: r.key, initial: null })} />
            ))}
          </div>
          </div>
        ) : (
          <Empty>No records with these settings.</Empty>
        )
      ) : section === "map" ? (
        <MapSection data={data} focus={mapFocus} onOpenWaterway={openWaterway} onUntraced={openWaterway} recordFor={findByName} length={length} />
      ) : section === "photos" ? (
        <PhotosSection />
      ) : section === "updates" ? (
        <UpdatesSection data={data} onOpenWaterway={openWaterway} />
      ) : (
        <ResourcesSection data={data} />
      )}

      <p className="pt-1 text-xs leading-relaxed text-[var(--dpwh-muted)]">
        From the OKB Single Source of Truth (SSOT v2), compiled from DPWH regional and district office reports to the OKB Secretariat. Volumes follow the
        accomplishment log where it has entries. Spotted a discrepancy? Email{" "}
        <a href="mailto:okb@dpwh.gov.ph" className="font-semibold text-[var(--dpwh-blue)] underline-offset-2 hover:underline">
          okb@dpwh.gov.ph
        </a>
        .
      </p>

      {regionOpen ? (
        <RegionSheet key={regionOpen.key} region={regionOpen} scale={data.scale} initial={openRegion?.initial} onClose={() => setOpenRegion(null)} onShowMap={showOnMap} />
      ) : null}
      <WaterwaySheet sel={selection} scale={data.scale} onClose={() => setSelection(null)} onShowMap={showOnMap} />
      {photoIndex !== null ? <PhotoViewer photos={data.photos.latest} index={photoIndex} onClose={() => setPhotoIndex(null)} onIndex={setPhotoIndex} /> : null}
    </div>
  );
}

