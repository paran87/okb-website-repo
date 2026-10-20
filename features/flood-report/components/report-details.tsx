"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { BadgeCheck, Building2, CameraOff, ChevronLeft, ChevronRight, CloudRain, Clock, Hourglass, MessageSquareText, Navigation, Play, Route, Ruler, Share2, TrafficCone, User, X } from "lucide-react";
import { FLOOD_SEVERITY } from "@/features/incident/lib/flood-severity";
import { cn } from "@/utils/cn";
import { formatDepth } from "../lib/options";
import type { PublicFloodReport } from "../types";
import { reportColor } from "./flood-map";

function clock(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** WhatsApp / Viber, as the map names the source. */
export const SOURCE_LABEL = { okb_mobile: "OKB Mobile", whatsapp: "WhatsApp", viber: "Viber" } as const;
export const SOURCE_COLOR = { okb_mobile: "#0f172a", whatsapp: "#1fa855", viber: "#7360f2" } as const;

/** A report's photos then videos, as the viewer shows them. */
export function mediaOf(report: Pick<PublicFloodReport, "photos" | "videos" | "locationText">): ViewerItem[] {
  return [
    ...report.photos.map((p, i) => ({ url: p.url, alt: `Flood photo ${i + 1} at ${report.locationText}` })),
    ...report.videos.map((v, i) => ({ url: v.url, alt: `Flood video ${i + 1} at ${report.locationText}`, video: true, poster: v.posterUrl ?? undefined })),
  ];
}

export interface ViewerItem {
  url: string;
  alt: string;
  /** A video (played with controls) instead of a photo. */
  video?: boolean;
  /** A video's first frame, shown before it plays. */
  poster?: string;
}

/** Full-screen swipeable photo (and video) viewer. */
export function PhotoViewer({
  photos,
  index,
  onClose,
  onIndex,
}: {
  photos: ViewerItem[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const [touchX, setTouchX] = useState<number | null>(null);
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex(Math.min(photos.length - 1, index + 1));
      if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndex]);
  if (index === null || !photos[index]) return null;
  const photo = photos[index];
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={photo.video ? "Video" : "Photo"}
      // A drag on the video (its seek bar) is not a swipe to the next item.
      onTouchStart={(e) => setTouchX((e.target as Element).closest("video") ? null : (e.touches[0]?.clientX ?? null))}
      onTouchEnd={(e) => {
        const end = e.changedTouches[0]?.clientX;
        if (touchX === null || end === undefined) return;
        if (end - touchX < -50) onIndex(Math.min(photos.length - 1, index + 1));
        if (end - touchX > 50) onIndex(Math.max(0, index - 1));
        setTouchX(null);
      }}
    >
      <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <span className="text-sm font-semibold">
          {index + 1} / {photos.length}
        </span>
        <button type="button" onClick={onClose} aria-label={photo.video ? "Close video" : "Close photo"} className="flex size-11 items-center justify-center rounded-full bg-white/15">
          <X className="size-6" aria-hidden />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {photo.video ? (
          <video key={photo.url} src={photo.url} poster={photo.poster} controls autoPlay playsInline aria-label={photo.alt} className="max-h-full max-w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- photos stream from R2 through our own route
          <img src={photo.url} alt={photo.alt} className="max-h-full max-w-full object-contain" />
        )}
        {index > 0 ? (
          <button
            type="button"
            onClick={() => onIndex(index - 1)}
            aria-label="Previous photo"
            className="absolute left-2 flex size-11 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </button>
        ) : null}
        {index < photos.length - 1 ? (
          <button
            type="button"
            onClick={() => onIndex(index + 1)}
            aria-label="Next photo"
            className="absolute right-2 flex size-11 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <ChevronRight className="size-6" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="break-words text-[15px] text-slate-900">{value}</p>
      </div>
    </div>
  );
}

/**
 * What a tapped flood report shows: photos and videos, depth, road, weather, times. A WhatsApp / Viber report
 * shows its message text (and says when no photos were added to it).
 */
export function ReportDetails({ report }: { report: PublicFloodReport }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const color = reportColor(report);
  const severity = FLOOD_SEVERITY[report.severity];
  const photos = mediaOf(report);
  const fromGroup = report.source !== "okb_mobile";
  const videos = report.videos.length;
  const shots = report.photos.length;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`;

  const share = async () => {
    const text = `Flood report: ${report.levelLabel ?? "Flooding"} at ${report.locationText}${report.area ? `, ${report.area}` : ""}`;
    const url = `${window.location.origin}${window.location.pathname}?report=${report.id}`;
    if (navigator.share) {
      await navigator.share({ title: "OKB flood report", text, url }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(`${text} ${url}`).catch(() => undefined);
    }
  };

  return (
    <div className="space-y-4 pb-2">
      {photos.length ? (
        <div className="relative -mx-4">
          <div
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none]"
            onScroll={(e) => {
              const el = e.currentTarget;
              setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
            }}
          >
            {photos.map((p, i) => (
              <button
                key={p.url}
                type="button"
                onClick={() => setViewer(i)}
                className="relative aspect-[4/3] w-full shrink-0 snap-center bg-slate-200"
                aria-label={p.video ? `Play video ${i + 1 - shots}` : `Open photo ${i + 1}`}
              >
                {p.video ? (
                  <>
                    <video src={`${p.url}#t=0.1`} poster={p.poster} preload="metadata" muted playsInline className="pointer-events-none size-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid size-14 place-items-center rounded-full bg-black/60 text-white">
                        <Play className="size-7 translate-x-0.5" aria-hidden />
                      </span>
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- photos stream from R2 through our own route
                  <img src={p.url} alt={p.alt} loading="lazy" className="size-full object-cover" />
                )}
              </button>
            ))}
          </div>
          {photos.length > 1 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {photos.map((p, i) => (
                <span key={p.url} className={cn("h-1.5 rounded-full bg-white/70 shadow transition-all", i === slide ? "w-5 bg-white" : "w-1.5")} />
              ))}
            </div>
          ) : null}
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            {[shots ? `${shots} photo${shots === 1 ? "" : "s"}` : "", videos ? `${videos} video${videos === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}
          </span>
        </div>
      ) : fromGroup ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-500">
          <CameraOff className="size-6 shrink-0" aria-hidden />
          <p className="text-sm">
            <span className="font-semibold text-slate-700">No photos uploaded</span>
            <br />
            OKB operators add photos and videos when they have them.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: color }}>
            {report.receded ? "Receded" : report.expired ? "Cleared" : report.levelLabel ?? severity.label}
            {report.depthM !== null ? ` · ${formatDepth(report.depthM)}` : ""}
          </span>
          {fromGroup ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white"
              style={{ background: SOURCE_COLOR[report.source] }}
            >
              <MessageSquareText className="size-4" aria-hidden />
              {SOURCE_LABEL[report.source]} report
            </span>
          ) : null}
          {report.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              <BadgeCheck className="size-4" aria-hidden />
              Verified by OKB
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Not yet verified</span>
          )}
        </div>
        <div>
          <p className="text-xl font-bold leading-tight text-slate-900">{report.locationText}</p>
          {report.area ? <p className="text-sm text-slate-600">{report.area}</p> : null}
          {report.landmark ? <p className="text-sm text-slate-600">Near {report.landmark}</p> : null}
        </div>
        <p className="text-sm text-slate-500">
          Reported {formatDistanceToNowStrict(new Date(report.reportedAt), { addSuffix: true })} · {report.reference}
        </p>
      </div>

      {report.text ? (
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Report as sent on {SOURCE_LABEL[report.source]}</p>
          <p className="mt-1 max-h-72 overflow-y-auto whitespace-pre-line break-words text-[15px] text-slate-900">{report.text}</p>
        </div>
      ) : null}

      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 px-3">
        <Row icon={Ruler} label="Flood height" value={report.depthM !== null ? `${report.levelLabel ?? "Flood"} (about ${formatDepth(report.depthM)})` : report.levelLabel} />
        <Row icon={TrafficCone} label="Road" value={report.roadStatus} />
        <Row
          icon={Route}
          label={report.stretch ? "Flooded stretch" : report.videos.length && report.photos.length < 2 ? "Where the video was filmed" : "Photo locations"}
          value={report.placement}
        />
        <Row icon={Building2} label="DPWH office (DEO)" value={report.deo} />
        <Row icon={CloudRain} label="Weather" value={report.weather} />
        <Row icon={Clock} label="Flood started" value={clock(report.startedAt)} />
        <Row
          icon={Clock}
          label="Flood receded"
          value={report.recededAt ? clock(report.recededAt) : report.expired ? "No update was sent" : "Not reported yet"}
        />
        <Row
          icon={Hourglass}
          label={report.active ? "Leaves the map" : "Left the map"}
          value={
            report.clearsAt
              ? `${clock(report.clearsAt)}${report.clearRule ? ` · ${report.clearRule} after the report` : " · when it receded"}${
                  report.active && report.clearRule ? ", unless the flood recedes earlier" : ""
                }`
              : null
          }
        />
        <Row
          icon={User}
          label="Reported by"
          value={fromGroup ? `A flood monitoring group on ${SOURCE_LABEL[report.source]}` : (report.senderName ?? "Anonymous")}
        />
      </div>

      {report.remarks ? (
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
          <p className="mt-1 whitespace-pre-line break-words text-[15px] text-slate-900">{report.remarks}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <a
          href={directions}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white active:bg-slate-700"
        >
          <Navigation className="size-4" aria-hidden />
          Directions
        </a>
        <button
          type="button"
          onClick={() => void share()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 active:bg-slate-100"
        >
          <Share2 className="size-4" aria-hidden />
          Share
        </button>
      </div>
      <p className="text-center text-xs text-slate-400">Avoid this area if you can. Never walk or drive through floodwater.</p>

      <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onIndex={setViewer} />
    </div>
  );
}
