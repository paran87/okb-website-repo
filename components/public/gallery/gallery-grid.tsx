"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronLeft, ChevronRight, Film, Images, LayoutGrid, List, MapPin, Play, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";
import { cn } from "@/utils/cn";
import type { GalleryYoutubeVideo } from "@/lib/config/gallery-youtube";
import type { GalleryDriveVideo } from "@/lib/config/gallery-drive-videos";

export interface PublicGalleryItem {
  key: string;
  kind: "photo" | "video";
  url: string;
  title: string | null;
  caption: string | null;
  /** When it was taken (the upload time if no date was entered). */
  takenAt?: string;
  place?: string | null;
  lastModified: string;
  /** Smaller picture for the grid and list (the Google Drive photos); `url` is the large one. */
  thumbUrl?: string;
  /** An embedded YouTube video (no file of ours behind it). */
  youtubeId?: string;
  /** A video of the public Google Drive folder, played in Drive's embedded player. */
  driveVideoId?: string;
  /** Who published it (YouTube videos). */
  source?: string;
}

const dateOf = (item: PublicGalleryItem) => {
  const d = new Date(item.takenAt ?? item.lastModified);
  return Number.isNaN(d.getTime()) ? "" : DATE.format(d);
};

/** The photos of the public Google Drive folder, as written by scripts/gallery-drive/crawl.mjs. */
export interface DriveGalleryData {
  places: { office: string | null; location: string | null; activity: string | null; label: string }[];
  /** [Drive file id, date (YYYY-MM-DD), place index (-1: none), stage] */
  photos: [string, string | null, number, "before" | "during" | "after" | null][];
}

type Sort = "newest" | "oldest";
/** Pictures shown at first, and added by each "Show more". */
const PAGE = 48;

const STAGE_LABEL = { before: "Before", during: "During", after: "After" } as const;

function drivePhotos(data: DriveGalleryData | undefined): PublicGalleryItem[] {
  if (!data) return [];
  return data.photos.map(([id, date, placeIdx, stage]) => {
    const place = placeIdx >= 0 ? data.places[placeIdx] : undefined;
    const parts = [place?.office, place?.activity, stage ? STAGE_LABEL[stage] : null].filter(Boolean);
    const at = date ? `${date}T00:00:00+08:00` : "";
    return {
      key: `drive:${id}`,
      kind: "photo" as const,
      url: `/api/gallery/drive-image?id=${id}&w=1600`,
      thumbUrl: `/api/gallery/drive-image?id=${id}&w=480`,
      title: place ? (place.location ?? place.label) : null,
      caption: parts.length ? parts.join(" · ") : null,
      takenAt: at || undefined,
      place: null,
      lastModified: at,
    };
  });
}

type Tab = "photo" | "video";
type Layout = "grid" | "list";

const LAYOUT_KEY = "okb-gallery-layout";

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
          {item.driveVideoId ? (
            <iframe
              key={item.key}
              src={`https://drive.google.com/file/d/${item.driveVideoId}/preview`}
              title={item.title ?? "Video"}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="aspect-video max-h-full w-full max-w-5xl rounded-sm border-0 bg-black"
            />
          ) : item.youtubeId ? (
            <iframe
              key={item.key}
              src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
              title={item.title ?? "YouTube video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="aspect-video max-h-full w-full max-w-5xl rounded-sm border-0 bg-black"
            />
          ) : item.kind === "photo" ? (
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
          {item.place ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
              <MapPin className="size-3.5 shrink-0" aria-hidden /> {item.place}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-white/50">
            {item.source ? `${item.source} · ` : ""}
            {item.youtubeId && !item.takenAt ? "YouTube" : dateOf(item)}
          </p>
        </div>
      </div>
    </Portal>
  );
}

/** Public gallery: Photos and Videos tabs, each as a grid or a list, with a full-screen viewer. */
export function GalleryGrid({
  items: uploaded,
  youtube = [],
  driveVideos = [],
  drive,
  problem = null,
}: {
  items: PublicGalleryItem[];
  youtube?: readonly GalleryYoutubeVideo[];
  driveVideos?: readonly GalleryDriveVideo[];
  drive?: DriveGalleryData;
  problem?: "not_configured" | "storage" | null;
}) {
  // YouTube videos come first in the Videos tab, then the uploaded ones.
  const items = useMemo<PublicGalleryItem[]>(
    () => [
      ...youtube.map((v) => ({
        key: `youtube:${v.id}`,
        kind: "video" as const,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        title: v.title,
        caption: v.caption,
        takenAt: v.date,
        lastModified: v.date ?? "",
        youtubeId: v.id,
        source: v.source,
      })),
      ...driveVideos.map((v) => ({
        key: `drive-video:${v.id}`,
        kind: "video" as const,
        url: `https://drive.google.com/file/d/${v.id}/view`,
        thumbUrl: `/api/gallery/drive-image?id=${v.id}&w=480`,
        title: v.title,
        caption: v.caption,
        takenAt: `${v.date}T00:00:00+08:00`,
        lastModified: `${v.date}T00:00:00+08:00`,
        driveVideoId: v.id,
      })),
      ...uploaded,
      ...drivePhotos(drive),
    ],
    [youtube, driveVideos, uploaded, drive],
  );
  const [sort, setSort] = useState<Sort>("newest");
  const [visible, setVisible] = useState(PAGE);
  // Photos by date: newest first, or the reverse. Pictures of the same day keep their folder order.
  const photos = useMemo(() => {
    const at = (i: PublicGalleryItem) => Date.parse(i.takenAt ?? i.lastModified) || 0;
    const newest = items.filter((i) => i.kind === "photo").sort((a, b) => at(b) - at(a));
    return sort === "newest" ? newest : newest.reverse();
  }, [items, sort]);
  const videos = useMemo(() => items.filter((i) => i.kind === "video"), [items]);
  const [tab, setTab] = useState<Tab>(photos.length || !videos.length ? "photo" : "video");
  const [layout, setLayout] = useState<Layout>("grid");
  const [open, setOpen] = useState<number | null>(null);
  const shown = tab === "photo" ? photos : videos;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAYOUT_KEY);
      if (saved === "grid" || saved === "list") setLayout(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const chooseLayout = (next: Layout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };
  const chooseTab = (next: Tab) => {
    setTab(next);
    setOpen(null);
    setVisible(PAGE);
  };
  const chooseSort = (next: Sort) => {
    setSort(next);
    setOpen(null);
    setVisible(PAGE);
  };

  const move = useCallback(
    (delta: number) => setOpen((i) => (i === null ? i : (i + delta + shown.length) % shown.length)),
    [shown.length],
  );

  if (!uploaded.length && !youtube.length && !driveVideos.length && problem) {
    return (
      <div className="okb-public-card rounded-sm px-6 py-16 text-center">
        <Images className="mx-auto size-10 opacity-60" aria-hidden />
        <p className="okb-public-heading mt-3 text-xl">The gallery could not be loaded</p>
        <p className="okb-public-body mt-1 text-sm">
          {problem === "not_configured"
            ? "The photo storage is not set up on the server yet."
            : "The photo storage (Cloudflare R2) could not be reached. Please try again in a moment."}
        </p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="okb-public-card rounded-sm px-6 py-16 text-center">
        <Images className="mx-auto size-10 opacity-60" aria-hidden />
        <p className="okb-public-heading mt-3 text-xl">Photos and videos are coming soon</p>
        <p className="okb-public-body mt-1 text-sm">Check back for updates from the field.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Images; count: number }[] = [
    { id: "photo", label: "Photos", icon: Images, count: photos.length },
    { id: "video", label: "Videos", icon: Film, count: videos.length },
  ];

  return (
    <div className="space-y-4">
      {problem === "storage" ? (
        <p className="okb-public-body rounded-sm border border-current/20 px-3 py-2 text-sm">
          Some photos and videos could not be loaded right now. Please try again in a moment.
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-current/15">
        <div role="tablist" aria-label="Gallery" className="flex gap-1">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => chooseTab(id)}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors",
                tab === id ? "border-[#0038a8] text-[#0038a8]" : "okb-public-body border-transparent hover:text-[#0038a8]",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label} ({count})
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Layout" className="mb-1.5 inline-flex rounded-full border border-current/20 p-0.5">
          {(
            [
              { id: "grid", label: "Grid", icon: LayoutGrid },
              { id: "list", label: "List", icon: List },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={layout === id}
              onClick={() => chooseLayout(id)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors",
                layout === id ? "bg-[#0038a8] text-white" : "okb-public-body",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "photo" && photos.length > 1 ? (
        <div role="radiogroup" aria-label="Sort photos by date" className="flex flex-wrap items-center gap-2">
          <span className="okb-public-body text-sm">Sort by date:</span>
          {(
            [
              { id: "newest", label: "Newest first", icon: ArrowDownWideNarrow },
              { id: "oldest", label: "Oldest first", icon: ArrowUpNarrowWide },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={sort === id}
              onClick={() => chooseSort(id)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                sort === id ? "border-[#0038a8] bg-[#0038a8] text-white" : "okb-public-body border-current/20 hover:border-[#0038a8]",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
          <span className="okb-public-body ml-auto text-xs opacity-70">
            Showing {Math.min(visible, photos.length)} of {photos.length}
          </span>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <div className="okb-public-card rounded-sm px-6 py-12 text-center">
          <p className="okb-public-heading text-lg">No {tab === "photo" ? "photos" : "videos"} yet</p>
          <p className="okb-public-body mt-1 text-sm">Check back for updates from the field.</p>
        </div>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {shown.slice(0, visible).map((item, i) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="group relative block aspect-square w-full overflow-hidden rounded-sm bg-black/10 text-left"
                aria-label={item.title ?? (item.kind === "photo" ? "Open photo" : "Play video")}
              >
                <Thumb item={item} zoom />
                {item.title ? (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2 pt-8 text-xs font-semibold text-white sm:text-sm">
                    <span className="line-clamp-2">{item.title}</span>
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-current/10 overflow-hidden rounded-sm border border-current/15">
          {shown.slice(0, visible).map((item, i) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="flex min-h-20 w-full items-center gap-3 p-2 text-left hover:bg-black/5"
                aria-label={item.title ?? (item.kind === "photo" ? "Open photo" : "Play video")}
              >
                <span className="relative block aspect-video w-28 shrink-0 overflow-hidden rounded-sm bg-black/10 sm:w-44">
                  <Thumb item={item} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="okb-public-heading line-clamp-2 block text-sm font-semibold sm:text-base">
                    {item.title ?? (item.kind === "photo" ? "Field photo" : "Operations video")}
                  </span>
                  {item.caption ? <span className="okb-public-body line-clamp-2 mt-0.5 block text-xs sm:text-sm">{item.caption}</span> : null}
                  <span className="okb-public-body mt-0.5 block text-xs opacity-70">
                    {item.place ? `${item.place} · ` : ""}
                    {dateOf(item)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {shown.length > visible ? (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE)}
          className="okb-public-body mx-auto flex min-h-11 items-center rounded-full border border-current/25 px-6 text-sm font-semibold hover:border-[#0038a8]"
        >
          Show more ({shown.length - visible} left)
        </button>
      ) : null}
      {open !== null ? <Lightbox items={shown} index={open} onClose={() => setOpen(null)} onMove={move} /> : null}
    </div>
  );
}

/** Photo, or video frame with a play badge, filling its box. */
function Thumb({ item, zoom = false }: { item: PublicGalleryItem; zoom?: boolean }) {
  if (item.driveVideoId) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbUrl}
          alt={item.title ?? ""}
          loading="lazy"
          decoding="async"
          className={cn("size-full object-cover", zoom && "transition-transform duration-500 group-hover:scale-105")}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white">
            <Play className="size-6 translate-x-0.5" aria-hidden />
          </span>
        </span>
      </>
    );
  }
  if (item.youtubeId) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`}
          alt={item.title ?? ""}
          loading="lazy"
          decoding="async"
          className={cn("size-full object-cover", zoom && "transition-transform duration-500 group-hover:scale-105")}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-9 w-14 items-center justify-center rounded-xl bg-[#e00] text-white shadow-md">
            <Play className="size-5 fill-current" aria-hidden />
          </span>
        </span>
      </>
    );
  }
  if (item.kind === "photo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.thumbUrl ?? item.url}
        alt={item.title ?? ""}
        loading="lazy"
        decoding="async"
        className={cn("size-full object-cover", zoom && "transition-transform duration-500 group-hover:scale-105")}
      />
    );
  }
  return (
    <>
      <video src={`${item.url}#t=0.5`} preload="metadata" muted playsInline className="pointer-events-none size-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-black/55 text-white">
          <Play className="size-5 translate-x-0.5" aria-hidden />
        </span>
      </span>
    </>
  );
}
