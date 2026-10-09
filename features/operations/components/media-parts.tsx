"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { LayoutGrid, List, MapPin, PlayCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import type { OperationsMediaItem } from "@/features/operations/types";

export type LayoutMode = "grid" | "list";

export function uploadedAt(item: OperationsMediaItem, pattern = "MMM d, yyyy · h:mm a"): string {
  const date = new Date(item.lastModified);
  return Number.isNaN(date.getTime()) ? "" : format(date, pattern);
}

export function mapsUrl(item: OperationsMediaItem): string | null {
  return item.geotag ? `https://www.google.com/maps?q=${item.geotag.lat},${item.geotag.lng}` : null;
}

/** Card / row heading: the place, else the note, else a generic label. */
export function itemTitle(item: OperationsMediaItem): string {
  return item.place ?? item.note ?? (item.kind === "photo" ? (item.geotag ? "Geotagged photo" : "Field photo") : "Operations video");
}

/** Short place for compact cards ("San Roque, Manila" → "San Roque"). */
export function shortPlace(item: OperationsMediaItem): string | null {
  return item.place?.split(",")[0]?.trim() || null;
}

const LAYOUT_KEY = "okb-operations-layout";

/** Grid / list choice, remembered on this device. */
export function useLayoutMode(storageKey = LAYOUT_KEY): [LayoutMode, (mode: LayoutMode) => void] {
  const [mode, setMode] = useState<LayoutMode>("grid");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "grid" || saved === "list") setMode(saved);
    } catch {
      /* storage unavailable */
    }
  }, [storageKey]);
  const update = (next: LayoutMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      /* storage unavailable */
    }
  };
  return [mode, update];
}

/** Segmented Grid / List switch. */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: LayoutMode;
  onChange: (mode: LayoutMode) => void;
  className?: string;
}) {
  const options = [
    { id: "grid" as const, label: "Grid", icon: LayoutGrid },
    { id: "list" as const, label: "List", icon: List },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Layout"
      className={cn("inline-flex rounded-full border border-border bg-card p-1 shadow-sm", className)}
    >
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-caption font-semibold transition-colors",
            value === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

/** Photo or video-frame thumbnail filling its box. */
export function MediaThumb({ item, className }: { item: OperationsMediaItem; className?: string }) {
  if (item.kind === "photo") {
    return (
      // Signed R2 links: shown as-is (the image optimizer would need every link allow-listed).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.url}
        alt={itemTitle(item)}
        loading="lazy"
        decoding="async"
        className={cn("size-full object-cover", className)}
      />
    );
  }
  return (
    <span className={cn("relative block size-full", className)}>
      <video
        src={`${item.url}#t=0.5`}
        preload="metadata"
        muted
        playsInline
        className="pointer-events-none size-full object-cover"
      />
      <PlayCircle
        className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow"
        aria-hidden
      />
    </span>
  );
}

/** Place line with a pin, or the note when there is no place. */
export function PlaceLine({ item, className }: { item: OperationsMediaItem; className?: string }) {
  const text = item.place ?? (item.geotag ? `${item.geotag.lat.toFixed(5)}, ${item.geotag.lng.toFixed(5)}` : item.note);
  if (!text) return null;
  return (
    <p className={cn("flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground", className)}>
      {item.geotag || item.place ? <MapPin className="size-3 shrink-0 text-primary" aria-hidden /> : null}
      <span className="truncate">{text}</span>
    </p>
  );
}
