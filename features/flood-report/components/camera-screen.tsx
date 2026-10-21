"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, Camera, Flashlight, FlashlightOff, Home, ImagePlus, LocateFixed, Play, RefreshCw, SendHorizontal, Trash2, Video, X } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { capturePhoto, decodeImage, stampLines, type StampInfo } from "../lib/capture";
import { MAX_PHOTOS, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } from "../lib/options";
import type { GeoState } from "../hooks/use-geolocation";
import type { CapturedPhoto, CapturedVideo, PlaceName, TrackPoint } from "../types";
import { BarTile, ControlBar, ShutterButton } from "./bar";

type CameraState = "starting" | "live" | "blocked" | "unsupported";

const RELOAD_KEY = "okb-camera-policy-reload";

/** MP4 plays everywhere (iPhone too); some Android browsers can only record WebM. */
const VIDEO_TYPES = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
/** About 2.5 Mbit/s: clear 720p–1080p street video, ~2.5 minutes in 50 MB. */
const VIDEO_BITRATE = 2_500_000;
/** Stop this far below the limit (the last second of data arrives after stop). */
const VIDEO_MARGIN = 1.5 * 1024 * 1024;

function recorderType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return VIDEO_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** The browser's name for the Android settings hint. */
function browserName(): string {
  if (typeof navigator === "undefined") return "your browser";
  if ("brave" in navigator) return "Brave";
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/EdgA/i.test(ua)) return "Edge";
  if (/OPR|Opera/i.test(ua)) return "Opera";
  if (/Chrome/i.test(ua)) return "Chrome";
  return "your browser";
}

function placeLines(place: PlaceName | null): string[] {
  if (!place) return [];
  const first = [place.road, place.barangay].filter(Boolean).join(", ");
  const second = [place.city, place.province && place.province !== place.city ? place.province : null].filter(Boolean).join(", ");
  const lines = [first, second].filter(Boolean);
  return lines.length ? lines : [place.label];
}

/** Live camera with the GPS stamp, shutter, send and the strip of up to five photos. */
export function CameraScreen({
  photos,
  geo,
  place,
  onAdd,
  onRemove,
  onSend,
  onBack,
  onCameraSettled,
  max = MAX_PHOTOS,
  video: recorded = null,
  onVideo,
}: {
  photos: CapturedPhoto[];
  /** The report's video (one per report); with onVideo, the camera can record one. */
  video?: CapturedVideo | null;
  onVideo?: (video: CapturedVideo | null) => void;
  geo: GeoState;
  place: PlaceName | null;
  onAdd: (photo: CapturedPhoto) => void;
  onRemove: (id: string) => void;
  onSend: () => void;
  onBack: () => void;
  /** Called once the camera is running or was refused, so the location prompt never competes with it. */
  onCameraSettled: () => void;
  /** Most photos to take now (fewer when adding to a report that already has some). */
  max?: number;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<CameraState>("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [attempt, setAttempt] = useState(0);
  /** "denied" when the browser remembers a refusal: only its site settings can undo it. */
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [reason, setReason] = useState<"system" | "dismissed" | "site" | "policy" | null>(null);
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<CapturedPhoto | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [recording, setRecording] = useState<{ startedAt: number; bytes: number } | null>(null);
  const [videoPreview, setVideoPreview] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  /** Where the phone is while a video is filmed (one fix a second or so), and the video's last frame. */
  const track = useRef<{ startedAt: number; points: TrackPoint[]; lastAt: number | null }>({ startedAt: 0, points: [], lastAt: null });
  const endFrame = useRef<Blob | null>(null);
  const canRecord = Boolean(onVideo) && recorderType() !== null;
  const full = photos.length >= max;
  const fix = geo.fix;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  // Leaving the camera stops a recording without keeping it.
  useEffect(
    () => () => {
      const r = recorder.current;
      if (r && r.state !== "inactive") {
        r.ondataavailable = null;
        r.onstop = null;
        r.stop();
      }
    },
    [],
  );

  // While filming, keep each new GPS fix: a video filmed on the move is drawn along the road it covered.
  useEffect(() => {
    if (!recording || !fix || fix.at === track.current.lastAt) return;
    track.current.lastAt = fix.at;
    track.current.points.push({
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyM: fix.accuracyM,
      t: Math.max(0, Math.round((Date.now() - track.current.startedAt) / 100) / 10),
    });
  }, [recording, fix]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera("unsupported");
        return;
      }
      // A page that still carries an older "no camera" site policy (an old tab, a cached page) reloads once.
      const policy = (document as Document & { permissionsPolicy?: { allowsFeature(f: string): boolean }; featurePolicy?: { allowsFeature(f: string): boolean } });
      const allowed = (policy.permissionsPolicy ?? policy.featurePolicy)?.allowsFeature("camera");
      if (allowed === false) {
        let reloaded = false;
        try {
          reloaded = sessionStorage.getItem(RELOAD_KEY) === "1";
          sessionStorage.setItem(RELOAD_KEY, "1");
        } catch {
          reloaded = true;
        }
        if (!reloaded) {
          window.location.reload();
          return;
        }
      }
      setCamera("starting");
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => undefined);
        }
        const track = s.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorch({ supported: Boolean(caps.torch), on: false });
        setCamera("live");
        try {
          sessionStorage.removeItem(RELOAD_KEY);
        } catch {
          /* storage unavailable */
        }
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        const message = err instanceof Error ? err.message.toLowerCase() : "";
        setCamera(name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "unsupported");
        // Chrome-based browsers say why: the phone denied the browser app, the prompt was dismissed, or the site is blocked.
        setReason(message.includes("system") ? "system" : message.includes("dismiss") ? "dismissed" : allowed === false ? "policy" : "site");
        const state = await navigator.permissions
          ?.query({ name: "camera" as PermissionName })
          .then((p) => p.state)
          .catch(() => null);
        if (!cancelled) setPermission(state ?? null);
      } finally {
        if (!cancelled) onCameraSettled();
      }
    }
    void start();
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
    // onCameraSettled is a stable callback from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, attempt]);

  // Start the camera again without waiting for Try again: when the browser lets the site use it (changed in the
  // site or phone settings) and when the page comes back from another app that took the camera.
  useEffect(() => {
    if (camera === "starting" || recording) return;
    let gone = false;
    let status: PermissionStatus | null = null;
    const retry = () => {
      if (!gone) setAttempt((n) => n + 1);
    };
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      if (camera === "live") {
        const t = stream.current?.getVideoTracks()[0];
        if (!t || t.readyState === "ended") return retry();
        if (video.current?.paused) await video.current.play().catch(() => undefined);
        return;
      }
      const state = await navigator.permissions
        ?.query({ name: "camera" as PermissionName })
        .then((p) => p.state)
        .catch(() => null);
      if (state === "granted") retry();
    };
    const onCheck = () => void check();
    const t = camera === "live" ? stream.current?.getVideoTracks()[0] : undefined;
    t?.addEventListener("ended", onCheck);
    document.addEventListener("visibilitychange", onCheck);
    window.addEventListener("pageshow", onCheck);
    window.addEventListener("focus", onCheck);
    if (camera !== "live") {
      void navigator.permissions
        ?.query({ name: "camera" as PermissionName })
        .then((p) => {
          if (gone) return;
          status = p;
          p.addEventListener("change", onCheck);
        })
        .catch(() => undefined);
    }
    return () => {
      gone = true;
      t?.removeEventListener("ended", onCheck);
      document.removeEventListener("visibilitychange", onCheck);
      window.removeEventListener("pageshow", onCheck);
      window.removeEventListener("focus", onCheck);
      status?.removeEventListener("change", onCheck);
    };
  }, [camera, recording]);

  const stampInfo = useCallback(
    (takenAt: Date): StampInfo | null =>
      fix ? { latitude: fix.latitude, longitude: fix.longitude, accuracyM: fix.accuracyM, takenAt, place: placeLines(place) } : null,
    [fix, place],
  );

  const add = useCallback(
    (blob: Blob, info: StampInfo) => {
      onAdd({
        id: crypto.randomUUID(),
        blob,
        url: URL.createObjectURL(blob),
        latitude: info.latitude,
        longitude: info.longitude,
        accuracyM: info.accuracyM,
        takenAt: info.takenAt.toISOString(),
      });
    },
    [onAdd],
  );

  const shoot = async () => {
    if (full) return setNotice(`Maximum of ${max} photo${max === 1 ? "" : "s"}. Delete one to take another.`);
    // Without the in-page camera the shutter asks for it again (never jumps to another app).
    if (camera === "blocked" || camera === "unsupported") return setAttempt((n) => n + 1);
    const v = video.current;
    if (!v || camera !== "live" || !v.videoWidth) return setNotice("Starting the camera…");
    const info = stampInfo(new Date());
    if (!info) return setNotice(geo.error ?? "Waiting for your GPS location…");
    setBusy(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    try {
      add(await capturePhoto(v, v.videoWidth, v.videoHeight, info), info);
      navigator.vibrate?.(30);
    } catch {
      setNotice("The photo could not be taken. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /** Starts a video: its first frame (with the GPS stamp) is kept as the thumbnail, its place is where it starts. */
  const startRecording = async () => {
    if (recorded) return setNotice("One video per report. Delete it to record another.");
    if (camera === "blocked" || camera === "unsupported") return setAttempt((n) => n + 1);
    const v = video.current;
    const s = stream.current;
    const type = recorderType();
    if (!v || !s || camera !== "live" || !v.videoWidth) return setNotice("Starting the camera…");
    if (!type) return setNotice("This browser cannot record video. Take photos instead.");
    const info = stampInfo(new Date());
    if (!info) return setNotice(geo.error ?? "Waiting for your GPS location…");
    let poster: Blob;
    try {
      poster = await capturePhoto(v, v.videoWidth, v.videoHeight, info);
    } catch {
      return setNotice("The video could not start. Please try again.");
    }
    const chunks: Blob[] = [];
    let bytes = 0;
    const startedAt = Date.now();
    track.current = {
      startedAt,
      points: [{ latitude: info.latitude, longitude: info.longitude, accuracyM: info.accuracyM, t: 0 }],
      lastAt: fix?.at ?? null,
    };
    endFrame.current = null;
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(s, { mimeType: type, videoBitsPerSecond: VIDEO_BITRATE });
    } catch {
      return setNotice("This browser cannot record video. Take photos instead.");
    }
    rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      chunks.push(e.data);
      bytes += e.data.size;
      setRecording((r) => (r ? { ...r, bytes } : r));
      // Stop before the size limit, or at the longest length.
      if ((bytes >= MAX_VIDEO_BYTES - VIDEO_MARGIN || Date.now() - startedAt >= MAX_VIDEO_SECONDS * 1000) && rec.state === "recording") void stopRecording();
    };
    rec.onstop = () => {
      recorder.current = null;
      setRecording(null);
      const blob = new Blob(chunks, { type: type.split(";")[0] });
      if (!blob.size) return setNotice("Nothing was recorded. Please try again.");
      if (blob.size > MAX_VIDEO_BYTES) return setNotice("The video is over 50 MB. Please record a shorter one.");
      onVideo?.({
        id: crypto.randomUUID(),
        blob,
        url: URL.createObjectURL(blob),
        poster,
        posterUrl: URL.createObjectURL(poster),
        latitude: info.latitude,
        longitude: info.longitude,
        accuracyM: info.accuracyM,
        takenAt: info.takenAt.toISOString(),
        durationS: Math.round((Date.now() - startedAt) / 1000),
        endPoster: endFrame.current,
        track: track.current.points.slice(0, 900),
      });
      navigator.vibrate?.(30);
    };
    recorder.current = rec;
    rec.start(1000);
    setRecording({ startedAt, bytes: 0 });
    navigator.vibrate?.(30);
  };

  /** Stops filming; the last frame is kept first, stamped with where the video ended. */
  const stopRecording = async () => {
    const r = recorder.current;
    if (!r || r.state !== "recording" || endFrame.current) return;
    const v = video.current;
    const info = stampInfo(new Date());
    endFrame.current = new Blob();
    if (v && info && v.videoWidth) {
      endFrame.current = await capturePhoto(v, v.videoWidth, v.videoHeight, info).catch(() => new Blob());
    }
    if (!endFrame.current.size) endFrame.current = null;
    if (r.state === "recording") r.stop();
  };

  const removeVideo = () => {
    if (recorded) {
      URL.revokeObjectURL(recorded.url);
      URL.revokeObjectURL(recorded.posterUrl);
    }
    onVideo?.(null);
    setVideoPreview(false);
  };

  const picked = async (file: File | undefined) => {
    if (!file) return;
    const info = stampInfo(new Date());
    if (!info) return setNotice(geo.error ?? "Waiting for your GPS location…");
    setBusy(true);
    try {
      const img = await decodeImage(file);
      add(await capturePhoto(img.source, img.width, img.height, info), info);
    } catch {
      setNotice("That photo could not be read. Please take it again.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on });
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  const leaveHome = (e: MouseEvent) => {
    if ((photos.length || recorded) && !window.confirm("Leave without sending? Your photos and video will be discarded.")) e.preventDefault();
  };

  const gpsLabel =
    geo.status === "ready" && fix
      ? `GPS ±${Math.round(fix.accuracyM ?? 0)} m`
      : geo.status === "denied"
        ? "Location blocked"
        : "Finding GPS…";
  const stamp = fix ? stampLines({ latitude: fix.latitude, longitude: fix.longitude, accuracyM: fix.accuracyM, takenAt: now, place: placeLines(place) }) : null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-black text-white">
      {/* Viewfinder */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          className={cn("absolute inset-0 size-full object-cover", facing === "user" && "-scale-x-100", camera !== "live" && "opacity-0")}
        />
        {camera !== "live" ? (
          // Scrolls on short screens, and starts below the top buttons so nothing hides under them.
          <div className="absolute inset-0 flex flex-col items-center gap-4 overflow-y-auto px-8 pb-4 pt-[calc(max(0.75rem,env(safe-area-inset-top))+3.75rem)] text-center [justify-content:safe_center]">
            <Camera className="size-10 shrink-0 text-white/60" aria-hidden />
            {camera === "starting" ? (
              <p className="text-white/80">Starting the camera… If your phone asks, tap Allow.</p>
            ) : (
              <>
                <p className="text-lg font-bold">
                  {camera === "blocked" ? "Allow the camera to take photos here" : "The camera could not start"}
                </p>
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-black"
                >
                  <RefreshCw className="size-5" aria-hidden />
                  Try again
                </button>
                {camera === "blocked" && reason === "system" ? (
                  <p className="max-w-xs text-sm text-white/80">
                    Your phone does not let {browserName()} use the camera. Open phone <b>Settings → Apps → {browserName()} → Permissions →
                    Camera → Allow</b>, then come back and tap Try again.
                  </p>
                ) : camera === "blocked" && reason === "dismissed" && permission !== "denied" ? (
                  <p className="max-w-xs text-sm text-white/80">Tap Try again, then choose <b>Allow</b> when your phone asks.</p>
                ) : camera === "blocked" && reason === "policy" ? (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="max-w-xs text-sm text-white/80 underline underline-offset-4"
                  >
                    Reload this page, then tap the round button again.
                  </button>
                ) : camera === "blocked" && (permission === "denied" || attempt > 0) ? (
                  <ol className="max-w-xs list-decimal space-y-1 pl-5 text-left text-sm text-white/80">
                    <li>Tap the icon at the left of the web address.</li>
                    <li>
                      Open <b>Permissions</b> (or <b>Site settings</b>) → <b>Camera</b> → <b>Allow</b>.
                    </li>
                    <li>Come back here: the camera starts by itself (or tap Try again).</li>
                    <li className="text-white/60">
                      Still blocked? Phone Settings → Apps → {browserName()} → Permissions → Camera → Allow.
                    </li>
                  </ol>
                ) : camera === "unsupported" ? (
                  <p className="max-w-xs text-sm text-white/70">Close other apps that use the camera, then try again.</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-white/70 underline underline-offset-4"
                >
                  <ImagePlus className="size-4" aria-hidden />
                  Use the phone&apos;s camera app instead
                </button>
              </>
            )}
          </div>
        ) : null}
        <div className={cn("pointer-events-none absolute inset-0 bg-white transition-opacity duration-150", flash ? "opacity-80" : "opacity-0")} />

        {/* Top controls */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent px-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to map"
            className="flex size-11 items-center justify-center rounded-full bg-black/45 backdrop-blur"
          >
            <ArrowLeft className="size-6" aria-hidden />
          </button>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur",
              geo.status === "ready" ? "bg-emerald-600/80" : geo.status === "denied" ? "bg-red-600/85" : "bg-black/50",
            )}
          >
            <LocateFixed className={cn("size-4", geo.status !== "ready" && geo.status !== "denied" && "animate-pulse")} aria-hidden />
            {gpsLabel}
          </span>
          <div className="flex gap-2">
            {torch.supported ? (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                aria-label={torch.on ? "Turn off flashlight" : "Turn on flashlight"}
                className="flex size-11 items-center justify-center rounded-full bg-black/45 backdrop-blur"
              >
                {torch.on ? <FlashlightOff className="size-5" aria-hidden /> : <Flashlight className="size-5" aria-hidden />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              aria-label="Switch camera"
              disabled={Boolean(recording)}
              className="flex size-11 items-center justify-center rounded-full bg-black/45 backdrop-blur disabled:opacity-40"
            >
              <RefreshCw className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        {recording ? (
          <div
            role="status"
            className="pointer-events-none absolute left-1/2 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600/90 px-3 py-1.5 text-sm font-bold tabular-nums"
          >
            <span className="size-2.5 animate-pulse rounded-full bg-white" aria-hidden />
            REC {clock((now.getTime() - recording.startedAt) / 1000)} · {mb(recording.bytes)} / 50 MB
          </div>
        ) : null}

        {/* Live GPS stamp (burned into each photo) */}
        {stamp && camera === "live" ? (
          <div className="pointer-events-none absolute bottom-3 right-3 max-w-[85%] bg-black/45 px-3 py-2 text-right text-[13px] font-semibold leading-snug [text-shadow:0_1px_2px_rgba(0,0,0,.7)]">
            <p className="text-[10px] font-bold tracking-wider text-amber-300">OKB FLOOD REPORT</p>
            {stamp.map((line, i) => (
              <p key={i} className="truncate">
                {line}
              </p>
            ))}
          </div>
        ) : geo.status === "denied" || geo.status === "unavailable" ? (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-red-600/90 px-3 py-2 text-sm font-medium">{geo.error}</div>
        ) : null}

        {notice ? (
          <div role="status" className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-black/80 px-4 py-3 text-center text-sm font-medium">
            {notice}
          </div>
        ) : null}
      </div>

      {canRecord && !recording && camera !== "blocked" && camera !== "unsupported" ? (
        <div className="flex shrink-0 justify-center bg-black pt-2">
          <div role="radiogroup" aria-label="Camera mode" className="flex rounded-full bg-white/10 p-1">
            {(["photo", "video"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn("h-10 min-w-24 rounded-full px-4 text-sm font-bold", mode === m ? "bg-white text-black" : "text-white/80")}
              >
                {m === "photo" ? "Photo" : "Video"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <ControlBar className="pb-3">
        <BarTile label="Home" href={ROUTES.incidents} align="start" onClick={leaveHome}>
          <Home className="size-8" aria-hidden />
        </BarTile>
        {mode === "video" && canRecord ? (
          <ShutterButton
            label={recording ? "Stop recording" : "Record video"}
            onClick={() => void (recording ? stopRecording() : startRecording())}
            video
            recording={Boolean(recording)}
            disabled={!recording && Boolean(recorded)}
          />
        ) : (
          <ShutterButton label="Take photo" onClick={() => void shoot()} busy={busy} disabled={full} />
        )}
        <BarTile
          label="Send"
          onClick={onSend}
          disabled={(!photos.length && !recorded) || Boolean(recording)}
          badge={photos.length + (recorded ? 1 : 0) || undefined}
          align="end"
        >
          <SendHorizontal className="size-8" aria-hidden />
        </BarTile>
      </ControlBar>

      {/* Captures (max 5 photos, 1 video) */}
      <div className="shrink-0 bg-black px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {recorded ? (
          <button
            type="button"
            onClick={() => setVideoPreview(true)}
            className="mx-auto mb-1.5 flex w-full max-w-md items-center gap-2 rounded-md bg-white/10 p-1 pr-3 text-left"
            aria-label="Your video: view or delete"
          >
            <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded ring-1 ring-white/30">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              <img src={recorded.posterUrl} alt="" className="size-full object-cover" />
              <Play className="absolute inset-0 m-auto size-4 fill-white" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-xs">
              <span className="block font-semibold">Video · {clock(recorded.durationS)}</span>
              <span className="text-white/60">{mb(recorded.blob.size)} · tap to view or delete</span>
            </span>
            <Video className="size-5 text-white/60" aria-hidden />
          </button>
        ) : null}
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1.5">
          {Array.from({ length: max }, (_, i) => {
            const p = photos[i];
            return p ? (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreview(p)}
                aria-label={`Photo ${i + 1}`}
                className="relative aspect-[4/3] overflow-hidden rounded-md ring-1 ring-white/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                <img src={p.url} alt="" className="size-full object-cover" />
              </button>
            ) : (
              <span key={`empty-${i}`} className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-white/25 text-xs text-white/35">
                {i + 1}
              </span>
            );
          })}
        </div>
        <p className="mt-1 text-center text-[11px] text-white/50">
          {photos.length}/{max} photos{canRecord ? ` · ${recorded ? 1 : 0}/1 video (up to 50 MB)` : ""} · tap to view or delete
        </p>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void picked(e.target.files?.[0])}
      />

      {videoPreview && recorded ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Video preview">
          <div className="flex justify-end px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button type="button" onClick={() => setVideoPreview(false)} aria-label="Close" className="flex size-11 items-center justify-center rounded-full bg-white/15">
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-2">
            <video src={recorded.url} poster={recorded.posterUrl} controls playsInline className="max-h-full max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button type="button" onClick={removeVideo} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold">
              <Trash2 className="size-5" aria-hidden />
              Delete
            </button>
            <button type="button" onClick={() => setVideoPreview(false)} className="h-12 rounded-xl bg-white font-semibold text-black">
              Keep
            </button>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Photo preview">
          <div className="flex justify-end px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button type="button" onClick={() => setPreview(null)} aria-label="Close" className="flex size-11 items-center justify-center rounded-full bg-white/15">
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={preview.url} alt="Captured flood photo" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              onClick={() => {
                onRemove(preview.id);
                setPreview(null);
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold"
            >
              <Trash2 className="size-5" aria-hidden />
              Delete
            </button>
            <button type="button" onClick={() => setPreview(null)} className="h-12 rounded-xl bg-white font-semibold text-black">
              Keep
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
