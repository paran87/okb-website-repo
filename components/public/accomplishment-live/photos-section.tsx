"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Search, X } from "lucide-react";
import type { FieldPhoto } from "@/features/accomplishment/public-types";
import { useFieldPhotos } from "@/components/public/accomplishment-live/data";
import { PhotoThumb, PhotoViewer } from "@/components/public/accomplishment-live/photo-viewer";
import { dayText, Empty, int, Panel } from "@/components/public/accomplishment-live/shared";
import { cn } from "@/utils/cn";

const PAGE = 48;
const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** Every field photo (WaterwayvsPicture), newest first, filterable by region, month and waterway. */
export function PhotosSection({ initialQuery = "" }: { initialQuery?: string }) {
  const photos = useFieldPhotos(true);
  const [region, setRegion] = useState("all");
  const [month, setMonth] = useState("all");
  const [query, setQuery] = useState(initialQuery);
  const [limit, setLimit] = useState(PAGE);
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => setLimit(PAGE), [region, month, query]);

  const all = useMemo(() => photos.data ?? [], [photos.data]);
  const regions = useMemo(() => [...new Set(all.map((p) => p.r).filter(Boolean))].sort(), [all]);
  const months = useMemo(() => [...new Set(all.map((p) => p.d?.slice(0, 7)).filter((m): m is string => Boolean(m)))].sort().reverse(), [all]);
  const q = query.trim().toLowerCase();
  const shown = useMemo<FieldPhoto[]>(
    () =>
      all.filter(
        (p) =>
          (region === "all" || p.r === region) &&
          (month === "all" || p.d?.startsWith(month)) &&
          (!q || p.w.toLowerCase().includes(q) || p.s.toLowerCase().includes(q)),
      ),
    [all, region, month, q],
  );
  const waterways = useMemo(() => new Set(shown.map((p) => p.w)).size, [shown]);

  return (
    <Panel title="Field photos" icon={Camera} action={all.length ? <span className="text-xs font-semibold text-[var(--dpwh-muted)]">{int(all.length)} photos</span> : null}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--dpwh-muted)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a waterway or site"
            aria-label="Find a waterway or site"
            className="h-11 w-full rounded-lg border border-[var(--dpwh-border)] bg-white pl-9 pr-10 text-sm text-[var(--dpwh-text)] outline-none focus:border-[var(--dpwh-blue)] focus:ring-2 focus:ring-[var(--dpwh-blue)]/20 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear" className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-[var(--dpwh-muted)]">
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </label>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region" className="h-11 rounded-lg border border-[var(--dpwh-border)] bg-white px-2 text-sm font-semibold text-[var(--dpwh-text)]">
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" className="h-11 rounded-lg border border-[var(--dpwh-border)] bg-white px-2 text-sm font-semibold text-[var(--dpwh-text)]">
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {MONTH.format(new Date(`${m}-01T00:00:00Z`))}
              </option>
            ))}
          </select>
        </div>
      </div>

      {photos.isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="aspect-square animate-pulse rounded-lg bg-[#d7dee8]" />
          ))}
        </div>
      ) : photos.error ? (
        <div className="mt-4">
          <Empty>The photos could not be loaded. Try again in a moment.</Empty>
        </div>
      ) : (
        <>
          <p className="mt-3 text-xs text-[var(--dpwh-muted)]">
            {int(shown.length)} photo{shown.length === 1 ? "" : "s"} of {int(waterways)} waterway{waterways === 1 ? "" : "s"}
            {shown.length ? ` · ${dayText(shown[shown.length - 1]?.d)} to ${dayText(shown[0]?.d)}` : ""}
          </p>
          {shown.length ? (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {shown.slice(0, limit).map((p, i) => (
                <PhotoThumb key={p.id} photo={p} onOpen={() => setViewer(i)} />
              ))}
            </div>
          ) : (
            <div className="mt-2">
              <Empty>No photos match.</Empty>
            </div>
          )}
          {shown.length > limit ? (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE)}
              className={cn("mt-3 h-11 w-full rounded-lg bg-[var(--dpwh-blue-dark)] text-sm font-bold text-white hover:bg-[var(--dpwh-blue)]")}
            >
              Show more ({int(shown.length - limit)} left)
            </button>
          ) : null}
        </>
      )}
      {viewer !== null ? <PhotoViewer photos={shown} index={viewer} onClose={() => setViewer(null)} onIndex={setViewer} /> : null}
    </Panel>
  );
}
