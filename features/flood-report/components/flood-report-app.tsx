"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CircleHelp, Copy, Home, LocateFixed, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { FLOOD_SEVERITY } from "@/features/incident/lib/flood-severity";
import { cn } from "@/utils/cn";
import { useFloodReports } from "../hooks/use-flood-reports";
import { useGeolocation } from "../hooks/use-geolocation";
import { useIsPhone } from "../hooks/use-is-phone";
import { usePlace } from "../hooks/use-place";
import { FloodReportApiError, sendReport, uploadPhoto } from "../lib/api";
import type { CapturedPhoto, PublicFloodReport, UploadedPhoto } from "../types";
import { BarTile, ControlBar, ShutterButton } from "./bar";
import { BottomSheet } from "./bottom-sheet";
import { CameraScreen } from "./camera-screen";
import { FloodMap, RECEDED_COLOR } from "./flood-map";
import { HelpSheet } from "./help-sheet";
import { ReportDetails } from "./report-details";
import { ReportForm, SendProgress, type ReportFormValues } from "./report-form";

const RANGES = [
  { hours: 6, label: "6h" },
  { hours: 24, label: "24h" },
  { hours: 72, label: "3d" },
  { hours: 168, label: "7d" },
] as const;

const LEGEND = [
  { label: "Low", color: FLOOD_SEVERITY.low.color },
  { label: "Medium", color: FLOOD_SEVERITY.medium.color },
  { label: "High", color: FLOOD_SEVERITY.high.color },
  { label: "Receded", color: RECEDED_COLOR },
];

type Screen = "map" | "camera" | "form";
type SendState = { stage: "uploading" | "saving"; progress: number } | { stage: "done"; report: PublicFloodReport } | null;

function rangeLabel(hours: number): string {
  return hours < 48 ? `last ${hours} h` : `last ${hours / 24} days`;
}

/** Mobile-only page: flood map, camera, form. */
function PhoneApp() {
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<number>(24);
  const reports = useFloodReports(hours);
  const [screen, setScreen] = useState<Screen>("map");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [focus, setFocus] = useState<{ latitude: number; longitude: number; zoom?: number; key: string } | null>(null);
  const [send, setSend] = useState<SendState>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  const reportId = useRef<string>("");
  // Location is asked only after the camera prompt is answered: Android browsers show one permission prompt
  // at a time and may refuse the camera if both are asked together.
  const [cameraSettled, setCameraSettled] = useState(false);
  const onCameraSettled = useCallback(() => setCameraSettled(true), []);
  const geo = useGeolocation(screen === "form" || (screen === "camera" && cameraSettled) || locating);
  const place = usePlace(screen !== "map" ? geo.fix : null);

  // Reports sent from this phone stay on the map even if a refresh comes from a server cache that is a few
  // seconds older than the report.
  const [mine, setMine] = useState<PublicFloodReport[]>([]);
  const list = useMemo(() => {
    const server = reports.data?.reports ?? [];
    const missing = mine.filter((m) => !server.some((r) => r.id === m.id));
    return missing.length ? [...missing, ...server] : server;
  }, [reports.data, mine]);
  const selected = list.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    reportId.current = crypto.randomUUID();
    // A shared link (?report=<id>) opens that report.
    const id = new URLSearchParams(window.location.search).get("report");
    if (id) {
      setLinked(id);
      setHours(168);
    }
  }, []);

  useEffect(() => {
    if (!linked) return;
    const r = list.find((x) => x.id === linked);
    if (!r) return;
    setLinked(null);
    setSelectedId(r.id);
    setFocus({ latitude: r.latitude, longitude: r.longitude, key: `link-${r.id}` });
  }, [linked, list]);

  // "Locate me": fly to the first fix, then stop following.
  useEffect(() => {
    if (!locating || !geo.fix) return;
    setFocus({ latitude: geo.fix.latitude, longitude: geo.fix.longitude, zoom: 15, key: `me-${geo.fix.at}` });
    setLocating(false);
  }, [locating, geo.fix]);

  const selectReport = useCallback(
    (id: string) => {
      setSelectedId(id);
      const r = list.find((x) => x.id === id);
      if (r) setFocus({ latitude: r.latitude, longitude: r.longitude, key: `sel-${id}-${Date.now()}` });
    },
    [list],
  );

  const addPhoto = useCallback((p: CapturedPhoto) => setPhotos((all) => [...all, p]), []);
  const removePhoto = useCallback((id: string) => {
    setPhotos((all) => {
      const gone = all.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return all.filter((p) => p.id !== id);
    });
  }, []);

  const reset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setFormError(null);
    reportId.current = crypto.randomUUID();
  };

  const submit = async (values: ReportFormValues) => {
    setFormError(null);
    setSend({ stage: "uploading", progress: 0 });
    const id = reportId.current;
    const current = [...photos];
    try {
      const uploaded: UploadedPhoto[] = [];
      for (let i = 0; i < current.length; i++) {
        const p = current[i]!;
        let key = p.key;
        if (!key) {
          key = await uploadPhoto(id, p.blob, (f) => setSend({ stage: "uploading", progress: (i + f) / current.length }));
          current[i] = { ...p, key };
          // Remember the key so a retry does not upload this photo again.
          setPhotos((all) => all.map((x) => (x.id === p.id ? { ...x, key } : x)));
        }
        uploaded.push({ key, latitude: p.latitude, longitude: p.longitude, accuracyM: p.accuracyM, takenAt: p.takenAt });
      }
      setSend({ stage: "saving", progress: 1 });
      const report = await sendReport({ ...values, id, photos: uploaded });
      setMine((all) => [report, ...all]);
      void queryClient.invalidateQueries({ queryKey: ["flood-reports"] });
      setSend({ stage: "done", report });
    } catch (err) {
      setSend(null);
      setFormError(err instanceof FloodReportApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  const finish = (next: "map" | "camera") => {
    const report = send?.stage === "done" ? send.report : null;
    reset();
    setSend(null);
    setScreen(next);
    if (next === "map" && report) {
      setSelectedId(report.id);
      setFocus({ latitude: report.latitude, longitude: report.longitude, zoom: 16, key: `new-${report.id}` });
    }
  };

  const active = list.filter((r) => !r.receded).length;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-200">
      {/* The map stays mounted under the camera and form, but out of reach of taps and screen readers. */}
      <div className="relative min-h-0 flex-1" inert={screen !== "map"}>
        <FloodMap reports={list} selectedId={selectedId} onSelect={selectReport} focus={focus} user={geo.fix} />

        {/* Header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 space-y-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-black/85 px-3 py-2 text-white shadow-lg backdrop-blur">
            {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
            <img src="/brand/oplan-kontra-baha-logo.png" alt="" className="size-9 shrink-0 rounded-full bg-white object-contain p-0.5" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-tight">OKB Flood Reports</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-white/75">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                {reports.isPending
                  ? "Loading reports…"
                  : `${list.length} report${list.length === 1 ? "" : "s"}${active !== list.length ? ` · ${active} still flooded` : ""} · ${rangeLabel(hours)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void reports.refetch()}
              aria-label="Refresh reports"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            >
              <RefreshCw className={cn("size-5", reports.isFetching && "animate-spin")} aria-hidden />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div role="radiogroup" aria-label="Time range" className="pointer-events-auto flex rounded-full bg-white p-1 shadow-md">
              {RANGES.map((r) => (
                <button
                  key={r.hours}
                  type="button"
                  role="radio"
                  aria-checked={hours === r.hours}
                  onClick={() => setHours(r.hours)}
                  className={cn(
                    "h-9 min-w-11 rounded-full px-3 text-sm font-semibold",
                    hours === r.hours ? "bg-black text-white" : "text-slate-700",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {reports.isError ? (
            <p className="pointer-events-auto w-fit rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow">
              Reports could not be loaded. Retrying…
            </p>
          ) : null}
        </div>

        {/* Legend + locate */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <div className="pointer-events-auto flex flex-wrap gap-x-2.5 gap-y-1 rounded-xl bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-md">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1">
                <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => (geo.fix ? setFocus({ latitude: geo.fix.latitude, longitude: geo.fix.longitude, zoom: 15, key: `me-${Date.now()}` }) : setLocating(true))}
            aria-label="Show my location"
            className="pointer-events-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg active:bg-slate-100"
          >
            <LocateFixed className={cn("size-6", locating && "animate-pulse")} aria-hidden />
          </button>
        </div>

        {reports.isSuccess && !list.length ? (
          <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl bg-white/95 p-4 text-center shadow-lg">
            <p className="font-bold text-slate-900">No flood reports in the {rangeLabel(hours)}</p>
            <p className="mt-1 text-sm text-slate-600">See a flooded street? Tap the round button below to send photos.</p>
          </div>
        ) : null}
      </div>

      <ControlBar className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" inert={screen !== "map"}>
        <BarTile label="Home" href={PUBLIC_ROUTES.commandCenter} align="start">
          <Home className="size-8" aria-hidden />
        </BarTile>
        <ShutterButton label="Take a picture of the flooded area" onClick={() => setScreen("camera")} />
        <BarTile label="Help" onClick={() => setHelpOpen(true)} align="end">
          <CircleHelp className="size-9" aria-hidden />
        </BarTile>
      </ControlBar>

      <BottomSheet open={Boolean(selected)} onClose={() => setSelectedId(null)} title="Flood report">
        {selected ? <ReportDetails key={selected.id} report={selected} /> : null}
      </BottomSheet>
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />

      {screen === "camera" ? (
        <CameraScreen
          photos={photos}
          geo={geo}
          place={place}
          onAdd={addPhoto}
          onRemove={removePhoto}
          onSend={() => {
            setFormError(null);
            setScreen("form");
          }}
          onBack={() => setScreen("map")}
          onCameraSettled={onCameraSettled}
        />
      ) : null}
      {screen === "form" ? (
        <ReportForm photos={photos} place={place} error={formError} onBack={() => setScreen("camera")} onSubmit={(v) => void submit(v)} />
      ) : null}
      {send ? (
        <SendProgress
          stage={send.stage}
          progress={send.stage === "done" ? 1 : send.progress}
          total={photos.length}
          reference={send.stage === "done" ? send.report.reference : null}
          onViewMap={() => finish("map")}
          onAnother={() => finish("camera")}
        />
      ) : null}
    </div>
  );
}

/** Shown on computers: the page is made for phones in the field. */
function DesktopNotice() {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href.split("?")[0] ?? ""), []);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-lg space-y-6 rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
          <img src="/brand/oplan-kontra-baha-logo.png" alt="" className="size-12 rounded-full bg-white object-contain p-1" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">OKB Command Center</p>
            <h1 className="text-2xl font-bold">Report a flood</h1>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-2xl bg-white/5 p-4">
          <Monitor className="mt-1 size-6 shrink-0 text-white/50" aria-hidden />
          <p className="text-white/80">
            This page is made for phones: it uses your phone&apos;s camera and GPS to send geotagged photos of a flooded street. Open it on
            your phone to send a report or to see the reports on the map.
          </p>
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Smartphone className="size-4" aria-hidden />
            Open this link on your phone
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-black/40 p-2 pl-4 ring-1 ring-white/10">
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{url}</span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(url).then(() => setCopied(true));
              }}
              className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black"
            >
              <Copy className="size-4" aria-hidden />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <a href={PUBLIC_ROUTES.commandCenter} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">
          <Home className="size-4" aria-hidden />
          Back to the Command Center
        </a>
      </div>
    </main>
  );
}

export function FloodReportApp() {
  const isPhone = useIsPhone();
  if (isPhone === null) return <div className="fixed inset-0 bg-black" aria-busy="true" />;
  return isPhone ? <PhoneApp /> : <DesktopNotice />;
}
