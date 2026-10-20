"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleHelp, Copy, Home, Loader2, LocateFixed, Monitor, RefreshCw, Smartphone, UserRound } from "lucide-react";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { FLOOD_SEVERITY } from "@/features/incident/lib/flood-severity";
import { cn } from "@/utils/cn";
import { useFloodReports } from "../hooks/use-flood-reports";
import { useGeolocation } from "../hooks/use-geolocation";
import { useIsPhone } from "../hooks/use-is-phone";
import { usePlace } from "../hooks/use-place";
import { deleteReport, fetchMyReports, FloodReportApiError, sendReport, updateReport, uploadPhoto } from "../lib/api";
import { addMyReportKey, readMyReportKeys, removeMyReportKey, type MyReportKey } from "../lib/my-reports";
import type { CapturedPhoto, FloodReportFormValues, MyFloodReport, PublicFloodReport, UploadedPhoto } from "../types";
import { BarTile, ControlBar, ShutterButton } from "./bar";
import { BottomSheet } from "./bottom-sheet";
import { CameraScreen } from "./camera-screen";
import { CLEARED_COLOR, FloodMap, RECEDED_COLOR } from "./flood-map";
import { HelpSheet } from "./help-sheet";
import { MyReportActions, MyReportPhotos, MyReportsSheet } from "./my-report";
import { ReportDetails } from "./report-details";
import { ReportForm, SendProgress, type ReportFormValues } from "./report-form";

/** "Now": floods still on the map. The others also show reports that receded or cleared (history). */
type Range = "now" | 24 | 72 | 168;
const RANGES: { id: Range; label: string }[] = [
  { id: "now", label: "Now" },
  { id: 24, label: "24h" },
  { id: 72, label: "3d" },
  { id: 168, label: "7d" },
];

const LEGEND = [
  { label: "Low", color: FLOOD_SEVERITY.low.color },
  { label: "Medium", color: FLOOD_SEVERITY.medium.color },
  { label: "High", color: FLOOD_SEVERITY.high.color },
];
const HISTORY_LEGEND = [
  { label: "Receded", color: RECEDED_COLOR },
  { label: "Cleared", color: CLEARED_COLOR },
];

/** Still flooded now (re-checked here so a report leaves the map on time between refreshes). */
function isActive(r: PublicFloodReport, now: number): boolean {
  return r.active && (!r.clearsAt || Date.parse(r.clearsAt) > now);
}

/** "edit", "photos" and "add-photos" work on one of this phone's reports (`ownId`). */
type Screen = "map" | "camera" | "form" | "edit" | "photos" | "add-photos";

const errorText = (err: unknown) => (err instanceof FloodReportApiError ? err.message : "Something went wrong. Please try again.");
type SendState = { stage: "uploading" | "saving"; progress: number } | { stage: "done"; report: PublicFloodReport } | null;

function rangeLabel(range: Exclude<Range, "now">): string {
  return range < 48 ? `last ${range} h` : `last ${range / 24} days`;
}

/** Mobile-only page: flood map, camera, form. */
function PhoneApp() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<Range>("now");
  // Every report still on the map is at most 6 hours old.
  const reports = useFloodReports(range === "now" ? 6 : range);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
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
  const capturing = screen === "camera" || screen === "add-photos";
  const geo = useGeolocation(screen === "form" || (capturing && cameraSettled) || locating);
  const place = usePlace(capturing || screen === "form" ? geo.fix : null);

  // Reports sent from this phone (their edit keys are kept in this browser).
  const [keys, setKeys] = useState<MyReportKey[]>([]);
  useEffect(() => {
    const load = () => setKeys(readMyReportKeys());
    load();
    window.addEventListener("okb-my-reports", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("okb-my-reports", load);
      window.removeEventListener("storage", load);
    };
  }, []);
  const myQuery = useQuery({
    queryKey: ["flood-reports", "mine", keys.map((k) => k.id).join(",")],
    queryFn: () => fetchMyReports(keys.map(({ id, token }) => ({ id, token }))),
    enabled: keys.length > 0,
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
  const myReports = useMemo(() => (keys.length ? (myQuery.data ?? []) : []), [keys.length, myQuery.data]);
  const [myOpen, setMyOpen] = useState(false);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [ownBusy, setOwnBusy] = useState(false);
  const [ownError, setOwnError] = useState<string | null>(null);
  const [extra, setExtra] = useState<CapturedPhoto[]>([]);
  const own = myReports.find((r) => r.id === ownId) ?? null;
  const tokenOf = (id: string) => keys.find((k) => k.id === id)?.token ?? null;

  // Reports sent from this phone stay on the map even if a refresh comes from a server cache that is a few
  // seconds older than the report.
  const [mine, setMine] = useState<PublicFloodReport[]>([]);
  const list = useMemo(() => {
    const server = reports.data?.reports ?? [];
    const missing = mine.filter((m) => !server.some((r) => r.id === m.id));
    const all = missing.length ? [...missing, ...server] : server;
    return range === "now" ? all.filter((r) => isActive(r, now)) : all;
  }, [reports.data, mine, range, now]);
  const selected = list.find((r) => r.id === selectedId) ?? myReports.find((r) => r.id === selectedId) ?? null;
  const selectedMine = selectedId ? (myReports.find((r) => r.id === selectedId) ?? null) : null;
  const selectedIsMine = selectedId ? keys.some((k) => k.id === selectedId) : false;

  useEffect(() => {
    reportId.current = crypto.randomUUID();
    // A shared link (?report=<id>) opens that report.
    const id = new URLSearchParams(window.location.search).get("report");
    if (id) {
      setLinked(id);
      setRange(168);
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
      const { report, editToken } = await sendReport({ ...values, id, photos: uploaded });
      addMyReportKey(report.id, editToken);
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

  // ---- the sender's own reports ----

  const formOf = (r: MyFloodReport): FloodReportFormValues => r.form;
  const keptPhotos = (r: MyFloodReport): UploadedPhoto[] =>
    r.photos.map((p) => ({
      key: p.key,
      latitude: p.latitude ?? r.latitude,
      longitude: p.longitude ?? r.longitude,
      accuracyM: p.accuracyM,
      takenAt: p.takenAt ?? r.reportedAt,
    }));

  /** Saves one of this phone's reports and refreshes the map and "My reports". */
  const saveOwn = async (r: MyFloodReport, values: FloodReportFormValues, photos: UploadedPhoto[]): Promise<boolean> => {
    const token = tokenOf(r.id);
    if (!token) return false;
    setOwnBusy(true);
    setOwnError(null);
    try {
      const updated = await updateReport(r.id, token, values, photos);
      setMine((all) => all.map((x) => (x.id === updated.id ? updated : x)));
      queryClient.setQueryData<MyFloodReport[]>(["flood-reports", "mine", keys.map((k) => k.id).join(",")], (old) =>
        old ? old.map((x) => (x.id === updated.id ? updated : x)) : old,
      );
      void queryClient.invalidateQueries({ queryKey: ["flood-reports"] });
      return true;
    } catch (err) {
      setOwnError(errorText(err));
      return false;
    } finally {
      setOwnBusy(false);
    }
  };

  const markReceded = async (r: MyFloodReport, when: "now" | "pick") => {
    if (when === "pick") {
      setOwnId(r.id);
      setOwnError(null);
      setScreen("edit");
      return;
    }
    await saveOwn(r, { ...formOf(r), recededAt: new Date().toISOString() }, keptPhotos(r));
  };

  const removeOwn = async (r: MyFloodReport) => {
    const token = tokenOf(r.id);
    if (!token) return;
    setOwnBusy(true);
    setOwnError(null);
    try {
      await deleteReport(r.id, token);
      removeMyReportKey(r.id);
      setMine((all) => all.filter((x) => x.id !== r.id));
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ["flood-reports"] });
    } catch (err) {
      setOwnError(errorText(err));
    } finally {
      setOwnBusy(false);
    }
  };

  /** Uploads the new captures and adds them to the report being managed. */
  const addOwnPhotos = async () => {
    if (!own || !extra.length) return setScreen("photos");
    setScreen("photos");
    setOwnBusy(true);
    setOwnError(null);
    try {
      const added: UploadedPhoto[] = [];
      for (const p of extra) {
        const key = p.key ?? (await uploadPhoto(own.id, p.blob, () => undefined));
        p.key = key;
        added.push({ key, latitude: p.latitude, longitude: p.longitude, accuracyM: p.accuracyM, takenAt: p.takenAt });
      }
      setOwnBusy(false);
      if (await saveOwn(own, formOf(own), [...keptPhotos(own), ...added])) {
        extra.forEach((p) => URL.revokeObjectURL(p.url));
        setExtra([]);
      }
    } catch (err) {
      setOwnError(errorText(err));
      setOwnBusy(false);
    }
  };

  const openOwn = (id: string) => {
    setMyOpen(false);
    setSelectedId(id);
    const r = list.find((x) => x.id === id) ?? myReports.find((x) => x.id === id);
    if (r) setFocus({ latitude: r.latitude, longitude: r.longitude, key: `mine-${id}-${Date.now()}` });
  };

  const active = list.filter((r) => isActive(r, now)).length;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-200">
      {/* The map stays mounted under the camera and form, but out of reach of taps and screen readers. */}
      <div className="relative min-h-0 flex-1" inert={screen !== "map"}>
        <FloodMap reports={list} selectedId={selectedId} onSelect={selectReport} focus={focus} user={geo.fix} fitKey={`${range}:${reports.isPlaceholderData ? "previous" : "loaded"}`} />

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
                  : range === "now"
                    ? active
                      ? `${active} flooded area${active === 1 ? "" : "s"} now`
                      : "No flooding reported now"
                    : `${list.length} report${list.length === 1 ? "" : "s"} · ${active} still flooded · ${rangeLabel(range)}`}
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
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={range === r.id}
                  onClick={() => setRange(r.id)}
                  className={cn(
                    "h-9 min-w-11 rounded-full px-3 text-sm font-semibold",
                    range === r.id ? "bg-black text-white" : "text-slate-700",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {keys.length ? (
              <button
                type="button"
                onClick={() => setMyOpen(true)}
                className="pointer-events-auto flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-md active:bg-blue-700"
              >
                <UserRound className="size-4" aria-hidden />
                Mine
                <span className="rounded-full bg-white/25 px-1.5 text-xs tabular-nums">{keys.length}</span>
              </button>
            ) : null}
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
            {(range === "now" ? LEGEND : [...LEGEND, ...HISTORY_LEGEND]).map((l) => (
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
            <p className="font-bold text-slate-900">
              {range === "now" ? "No flooding reported right now" : `No flood reports in the ${rangeLabel(range)}`}
            </p>
            <p className="mt-1 text-sm text-slate-600">See a flooded street? Tap the round button below to send photos.</p>
            {range === "now" ? (
              <p className="mt-1 text-xs text-slate-500">Reports leave the map when the flood recedes, or after 2–6 hours depending on the weather.</p>
            ) : null}
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

      <BottomSheet
        // Hidden (not closed) while the edit, photo or camera screens are open over the map; back on return.
        open={Boolean(selected) && screen === "map"}
        onClose={() => {
          setSelectedId(null);
          setOwnError(null);
        }}
        title={selectedIsMine ? "Your flood report" : "Flood report"}
      >
        {selected ? (
          <div key={selected.id} className="space-y-4">
            {selectedMine ? (
              <>
                <MyReportActions
                  report={selectedMine}
                  busy={ownBusy}
                  onReceded={(when) => void markReceded(selectedMine, when)}
                  onEdit={() => {
                    setOwnId(selectedMine.id);
                    setOwnError(null);
                    setScreen("edit");
                  }}
                  onPhotos={() => {
                    setOwnId(selectedMine.id);
                    setOwnError(null);
                    setScreen("photos");
                  }}
                  onDelete={() => void removeOwn(selectedMine)}
                />
                {ownError && screen === "map" ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{ownError}</p> : null}
              </>
            ) : selectedIsMine && myQuery.isPending ? (
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Loading your controls…
              </p>
            ) : null}
            <ReportDetails report={selected} />
          </div>
        ) : null}
      </BottomSheet>
      <MyReportsSheet open={myOpen} onClose={() => setMyOpen(false)} reports={myReports} loading={myQuery.isFetching} onOpen={openOwn} />
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
      {screen === "edit" && own ? (
        <ReportForm
          key={own.id}
          photos={own.photos.map((p) => ({ id: p.key, url: p.url, latitude: p.latitude, longitude: p.longitude, accuracyM: p.accuracyM, takenAt: p.takenAt }))}
          place={own.form.place}
          initial={own.form}
          error={ownError}
          onBack={() => setScreen("map")}
          onSubmit={(values) => {
            const { website: _website, ...form } = values;
            void _website;
            void saveOwn(own, form, keptPhotos(own)).then((ok) => ok && setScreen("map"));
          }}
        />
      ) : null}
      {screen === "photos" && own ? (
        <MyReportPhotos
          report={own}
          busy={ownBusy}
          error={ownError}
          onBack={() => setScreen("map")}
          onRemove={(key) => void saveOwn(own, formOf(own), keptPhotos(own).filter((p) => p.key !== key))}
          onAdd={() => {
            setOwnError(null);
            setScreen("add-photos");
          }}
        />
      ) : null}
      {screen === "add-photos" && own ? (
        <CameraScreen
          photos={extra}
          geo={geo}
          place={place}
          max={Math.max(0, 5 - own.photos.length)}
          onAdd={(p) => setExtra((all) => [...all, p])}
          onRemove={(id) =>
            setExtra((all) => {
              const gone = all.find((p) => p.id === id);
              if (gone) URL.revokeObjectURL(gone.url);
              return all.filter((p) => p.id !== id);
            })
          }
          onSend={() => void addOwnPhotos()}
          onBack={() => setScreen("photos")}
          onCameraSettled={onCameraSettled}
        />
      ) : null}
      {ownBusy && screen === "edit" ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 text-white" role="status">
          <Loader2 className="mr-2 size-6 animate-spin" aria-hidden /> Saving your changes…
        </div>
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
