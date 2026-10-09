"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GripHorizontal,
  Images,
  MapPin,
  Maximize2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import type { OperationsMediaItem } from "@/features/operations/types";
import {
  itemTitle,
  mapsUrl,
  MediaThumb,
  PlaceLine,
  shortPlace,
  uploadedAt,
  useLayoutMode,
  ViewToggle,
} from "@/features/operations/components/media-parts";
import { PhotoMap } from "@/features/operations/components/photo-map";

const MAP_MIN = 160;
/** Thumbnails rendered at a time in "More photos". */
const MORE_PAGE = 60;
const MAP_DEFAULT = 260;

/** Phone layout: drag the handle under the map to make it taller or shorter. */
function useMapHeight() {
  const [height, setHeight] = useState(MAP_DEFAULT);
  const drag = useRef<{ y: number; h: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    drag.current = { y: e.clientY, h: height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const max = Math.round(window.innerHeight * 0.7);
    setHeight(Math.min(max, Math.max(MAP_MIN, drag.current.h + e.clientY - drag.current.y)));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  return { height, handle: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}

function MorePhotos({
  items,
  index,
  onSelect,
}: {
  items: OperationsMediaItem[];
  index: number;
  onSelect: (index: number) => void;
}) {
  const [layout, setLayout] = useLayoutMode("okb-operations-more-layout");
  const scroller = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(MORE_PAGE);
  // Always include the open photo (and a few after it) in what is rendered.
  const shown = items.slice(0, Math.max(limit, index + 1 + 12));

  // Keep the current photo in view inside the panel (without scrolling the page).
  useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!box || !el) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
    }
  }, [index, layout]);

  return (
    <Card className="flex min-w-0 flex-col p-4">
      <p className="text-subheading text-foreground">More photos</p>
      <p className="text-caption text-muted-foreground">Keep browsing the gallery</p>
      <ViewToggle value={layout} onChange={setLayout} className="mt-3 self-start" />
      <div ref={scroller} className="relative mt-3 max-h-[420px] overflow-y-auto pr-1 @6xl:max-h-[600px]">
        {layout === "grid" ? (
          <div className="grid grid-cols-3 gap-2 @xl:grid-cols-4 @3xl:grid-cols-6 @6xl:grid-cols-2">
            {shown.map((item, i) => (
              <button
                key={item.key}
                type="button"
                data-index={i}
                onClick={() => onSelect(i)}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-colors",
                  i === index ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50",
                )}
              >
                <span className="relative block aspect-[4/3] bg-muted">
                  <MediaThumb item={item} />
                  <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {uploadedAt(item, "MMM d")}
                  </span>
                </span>
                <span className="block space-y-0.5 px-2 py-1.5">
                  <span className="block truncate text-[11px] font-semibold text-foreground">
                    {shortPlace(item) ?? itemTitle(item)}
                  </span>
                  <PlaceLine item={item} className="text-[10px]" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {shown.map((item, i) => (
              <li key={item.key}>
                <button
                  type="button"
                  data-index={i}
                  onClick={() => onSelect(i)}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-xl border p-1.5 text-left transition-colors",
                    i === index ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50",
                  )}
                >
                  <span className="block size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <MediaThumb item={item} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-caption font-semibold text-foreground">
                      {shortPlace(item) ?? itemTitle(item)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">{uploadedAt(item)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {items.length > shown.length ? (
          <Button
            variant="outline"
            className="mt-2 w-full justify-center"
            onClick={() => setLimit(shown.length + MORE_PAGE)}
          >
            Show more ({items.length - shown.length} left)
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * One photo with its location: map (left / top on phones), the photo with
 * previous / next, its details, and the rest of the gallery to keep browsing.
 */
export function PhotoDetail({
  items,
  index,
  sectionLabel,
  onIndexChange,
  onClose,
  onDelete,
}: {
  items: OperationsMediaItem[];
  index: number;
  sectionLabel: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onDelete: (item: OperationsMediaItem) => void;
}) {
  const item = items[index];
  const viewer = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const { height: mapHeight, handle } = useMapHeight();
  const count = items.length;

  const go = (delta: number) => {
    if (count > 0) onIndexChange((index + delta + count) % count);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [role=dialog]")) return;
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
      else if (e.key === "ArrowRight") onIndexChange((index + 1) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onIndexChange]);

  if (!item) return null;
  const map = mapsUrl(item);
  const title = itemTitle(item);

  const fullscreen = () => {
    const el = viewer.current;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => window.open(item.url, "_blank"));
    else window.open(item.url, "_blank");
  };

  return (
    <div className="@container space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={onClose} leftIcon={<ArrowLeft className="size-4" aria-hidden />}>
          Back to gallery
        </Button>
        <p className="text-caption text-muted-foreground">
          {index + 1} of {count}
        </p>
      </div>

      <div className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_300px]">
        {/* Location */}
        <Card className="flex min-w-0 flex-col overflow-hidden">
          <div className="hidden items-center gap-3 px-4 py-3 @3xl:flex">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Images className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-subheading text-foreground">Photo location</p>
              <p className="truncate text-caption text-muted-foreground">
                {item.place ?? (item.geotag ? "Location from the photo's GPS" : "Location not available")}
                {item.geotag?.approx ? " · approximate" : ""}
              </p>
            </div>
          </div>
          <PhotoMap
            lat={item.geotag?.lat ?? null}
            lng={item.geotag?.lng ?? null}
            label={shortPlace(item) ?? "Photo"}
            className="h-[var(--map-h)] w-full @3xl:h-auto @3xl:min-h-[420px] @3xl:flex-1"
            style={{ "--map-h": `${mapHeight}px` } as CSSProperties}
          />
          <button
            type="button"
            aria-label="Drag to resize the map"
            {...handle}
            className="flex h-10 touch-none select-none items-center justify-center gap-1.5 border-t border-border text-[11px] font-semibold text-primary @3xl:hidden"
          >
            <GripHorizontal className="size-4" aria-hidden />
            Drag
          </button>
          <div className="hidden items-center justify-between gap-2 border-t border-border px-4 py-2.5 @3xl:flex">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="size-2 rounded-full bg-[#c2410c]" aria-hidden />
              Coordinates
            </span>
            <span className="font-mono text-caption text-foreground">
              {item.geotag
                ? `${item.geotag.approx ? "≈ " : ""}${item.geotag.lat.toFixed(5)}, ${item.geotag.lng.toFixed(5)}`
                : "Not available"}
            </span>
          </div>
        </Card>

        {/* Photo + details */}
        <div className="min-w-0 space-y-4">
          <div
            ref={viewer}
            className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card bg-black shadow-sm"
            onTouchStart={(e) => {
              touchX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchX.current;
              const end = e.changedTouches[0]?.clientX;
              touchX.current = null;
              if (start !== null && end !== undefined && Math.abs(end - start) > 50) go(end < start ? 1 : -1);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={item.key} src={item.url} alt={title} className="max-h-full max-w-full object-contain" />
            <button
              type="button"
              onClick={fullscreen}
              aria-label="View full screen"
              className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
            >
              <Maximize2 className="size-4" aria-hidden />
            </button>
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </>
            ) : null}
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              {index + 1} / {count}
            </span>
          </div>

          <Card className="space-y-3 p-4">
            <div>
              <h2 className="text-subheading text-foreground">{title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-caption text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden />
                {uploadedAt(item, "MMMM d, yyyy")}
              </p>
            </div>
            <div className="grid gap-3 @xl:grid-cols-2 @3xl:grid-cols-1 @6xl:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <MapPin className="size-3.5 text-[#c2410c]" aria-hidden />
                  Location
                </p>
                <p className="mt-1 text-caption text-foreground">{item.place ?? "Place not identified"}</p>
                {item.geotag ? (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {item.geotag.lat.toFixed(6)}, {item.geotag.lng.toFixed(6)}
                  </p>
                ) : null}
                {item.geotag?.approx ? (
                  <p className="mt-1 text-[11px] text-warning">
                    Approximate — located from the address printed on the stamp.
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Details</p>
                <dl className="mt-1 space-y-0.5 text-caption">
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <dt className="text-muted-foreground">Section</dt>
                    <dd className="text-right text-foreground">{sectionLabel}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <dt className="text-muted-foreground">Uploaded</dt>
                    <dd className="text-right text-foreground">{uploadedAt(item, "MMMM d, yyyy")}</dd>
                  </div>
                </dl>
              </div>
            </div>
            {item.note ? (
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
                <p className="mt-1 text-caption text-foreground">{item.note}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              {map ? (
                <a
                  href={map}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border px-4 text-body text-foreground hover:bg-muted/50"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Google Maps
                </a>
              ) : null}
              <Button
                variant="danger"
                leftIcon={<Trash2 className="size-4" aria-hidden />}
                onClick={() => onDelete(item)}
                className={cn("justify-center", !map && "col-span-2")}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>

        {/* Rest of the gallery */}
        <div className="min-w-0 @3xl:col-span-2 @6xl:col-span-1">
          <MorePhotos items={items} index={index} onSelect={onIndexChange} />
        </div>
      </div>
    </div>
  );
}
