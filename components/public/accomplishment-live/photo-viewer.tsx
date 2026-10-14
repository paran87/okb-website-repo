"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, MapPin, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";
import type { FieldPhoto } from "@/features/accomplishment/public-types";
import { dayText, photoUrl } from "@/components/public/accomplishment-live/shared";
import { cn } from "@/utils/cn";

/** A field photo thumbnail that hides itself gracefully when the file is not shared. */
export function PhotoThumb({ photo, onOpen, className, label = true }: { photo: FieldPhoto; onOpen: () => void; className?: string; label?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn("group relative block aspect-square w-full overflow-hidden rounded-lg bg-[#cfd8e3] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dpwh-orange)]", className)}
      aria-label={`Photo of ${photo.w}${photo.d ? `, ${dayText(photo.d)}` : ""}`}
    >
      {failed ? (
        <span className="flex size-full flex-col items-center justify-center gap-1 text-[var(--dpwh-muted)]">
          <ImageOff className="size-6" aria-hidden />
          <span className="text-[10px] font-semibold">Not shared</span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl(photo.id, 400)}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      {label ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-1.5 pt-6">
          <span className="block truncate text-[11px] font-bold leading-tight text-white">{photo.w}</span>
          <span className="block truncate text-[10px] text-white/80">{dayText(photo.d)}</span>
        </span>
      ) : null}
    </button>
  );
}

/** Full-screen photo viewer: swipe or arrow keys, caption with waterway, place and date. */
export function PhotoViewer({ photos, index, onClose, onIndex }: { photos: FieldPhoto[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  useEscapeKey(true, onClose);
  useLockBodyScroll(true);
  const [loaded, setLoaded] = useState(false);
  const touch = useRef<number | null>(null);
  const photo = photos[index];
  const go = useCallback((delta: number) => onIndex((index + delta + photos.length) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => setLoaded(false), [index]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);
  // Warm the neighbours.
  useEffect(() => {
    for (const d of [1, -1]) {
      const p = photos[(index + d + photos.length) % photos.length];
      if (p) new Image().src = photoUrl(p.id, 1600);
    }
  }, [index, photos]);
  if (!photo) return null;

  return (
    <Portal>
      <div role="dialog" aria-modal="true" aria-label={`Photo of ${photo.w}`} className="fixed inset-0 z-[90] flex flex-col bg-[#000d1d]/97">
        <div className="flex items-center justify-between gap-2 px-2 py-2 text-white">
          <span className="pl-2 text-sm tabular-nums text-white/70">
            {index + 1} / {photos.length}
          </span>
          <div className="flex items-center gap-1">
            <a
              href={`https://lh3.googleusercontent.com/d/${photo.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white/85 hover:bg-white/10"
            >
              <ExternalLink className="size-4" aria-hidden /> Original
            </a>
            <button type="button" onClick={onClose} aria-label="Close" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
              <X className="size-6" aria-hidden />
            </button>
          </div>
        </div>
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-2"
          onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const start = touch.current;
            const end = e.changedTouches[0]?.clientX;
            touch.current = null;
            if (start === null || end === undefined || Math.abs(end - start) < 40) return;
            go(end < start ? 1 : -1);
          }}
        >
          {!loaded ? <span className="absolute size-10 animate-spin rounded-full border-2 border-white/20 border-t-[var(--dpwh-gold)]" aria-hidden /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.id}
            src={photoUrl(photo.id, 1600)}
            alt={`${photo.w}${photo.d ? `, ${dayText(photo.d)}` : ""}`}
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            className={cn("max-h-full max-w-full object-contain transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
          />
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70 sm:flex"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70 sm:flex"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-white">
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 sm:hidden">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold uppercase tracking-wide">{photo.w}</p>
            <p className="flex items-center gap-1 truncate text-xs text-white/70">
              {photo.r || photo.s ? <MapPin className="size-3.5 shrink-0" aria-hidden /> : null}
              {[photo.r, photo.s].filter(Boolean).join(" · ")}
              {photo.d ? ` · ${dayText(photo.d)}` : ""}
            </p>
          </div>
          <button type="button" onClick={() => go(1)} aria-label="Next photo" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 sm:hidden">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </Portal>
  );
}
