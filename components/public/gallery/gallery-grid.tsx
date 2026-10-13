"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Film, Images, Play, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";
import { cn } from "@/utils/cn";

export interface PublicGalleryItem {
  key: string;
  kind: "photo" | "video";
  url: string;
  title: string | null;
  caption: string | null;
  lastModified: string;
}

type Filter = "all" | "photo" | "video";

const DATE = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" });

function Lightbox({
  items,
  index,
  onClose,
  onMove,
}: {
  items: PublicGalleryItem[];
  index: number;
  onClose: () => void;
  onMove: (delta: number) => void;
}) {
  useEscapeKey(true, onClose);
  useLockBodyScroll(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onMove(-1);
      if (e.key === "ArrowRight") onMove(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMove]);
  const item = items[index];
  if (!item) return null;
  return (
    <Portal>
      <div role="dialog" aria-modal="true" aria-label={item.title ?? "Gallery item"} className="fixed inset-0 z-[70] flex flex-col bg-black/95">
        <div className="flex items-center justify-between gap-2 px-2 py-2 text-white">
          <span className="pl-2 text-sm tabular-nums text-white/70">
            {index + 1} / {items.length}
          </span>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
            <X className="size-6" aria-hidden />
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
          {item.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.title ?? "Gallery photo"} className="max-h-full max-w-full object-contain" />
          ) : (
            <video key={item.key} src={item.url} controls autoPlay playsInline className="max-h-full max-w-full" />
          )}
          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => onMove(-1)}
                aria-label="Previous"
                className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                aria-label="Next"
                className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-white">
          {item.title ? <p className="text-base font-semibold">{item.title}</p> : null}
          {item.caption ? <p className="mt-1 text-sm text-white/80">{item.caption}</p> : null}
          <p className="mt-1 text-xs text-white/50">{DATE.format(new Date(item.lastModified))}</p>
        </div>
      </div>
    </Portal>
  );
}

/** Public gallery grid with a full-screen viewer. */
export function GalleryGrid({ items }: { items: PublicGalleryItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<number | null>(null);
  const shown = useMemo(() => items.filter((i) => filter === "all" || i.kind === filter), [items, filter]);
  const move = useCallback(
    (delta: number) => setOpen((i) => (i === null ? i : (i + delta + shown.length) % shown.length)),
    [shown.length],
  );

  if (!items.length) {
    return (
      <div className="okb-public-card rounded-sm px-6 py-16 text-center">
        <Images className="mx-auto size-10 opacity-60" aria-hidden />
        <p className="okb-public-heading mt-3 text-xl">Photos and videos are coming soon</p>
        <p className="okb-public-body mt-1 text-sm">Check back for updates from the field.</p>
      </div>
    );
  }

  const photos = items.filter((i) => i.kind === "photo").length;
  const videos = items.length - photos;
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${items.length})` },
    { id: "photo", label: `Photos (${photos})` },
    { id: "video", label: `Videos (${videos})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Show">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
              filter === f.id
                ? "border-[#0038a8] bg-[#0038a8] text-white"
                : "border-current/20 okb-public-body hover:border-[#0038a8]",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {shown.map((item, i) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-sm bg-black/10 text-left"
              aria-label={item.title ?? (item.kind === "photo" ? "Open photo" : "Play video")}
            >
              {item.kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.title ?? ""}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <>
                  <video src={`${item.url}#t=0.5`} preload="metadata" muted playsInline className="size-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white">
                      <Play className="size-6 translate-x-0.5" aria-hidden />
                    </span>
                  </span>
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                    <Film className="size-3" aria-hidden /> Video
                  </span>
                </>
              )}
              {item.title ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2 pt-8 text-xs font-semibold text-white sm:text-sm">
                  <span className="line-clamp-2">{item.title}</span>
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {open !== null ? <Lightbox items={shown} index={open} onClose={() => setOpen(null)} onMove={move} /> : null}
    </div>
  );
}
