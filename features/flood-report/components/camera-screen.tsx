"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, Camera, Flashlight, FlashlightOff, Home, ImagePlus, LocateFixed, RefreshCw, SendHorizontal, Trash2, X } from "lucide-react";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { capturePhoto, decodeImage, stampLines, type StampInfo } from "../lib/capture";
import { MAX_PHOTOS } from "../lib/options";
import type { GeoState } from "../hooks/use-geolocation";
import type { CapturedPhoto, PlaceName } from "../types";
import { BarTile, ControlBar, ShutterButton } from "./bar";

type CameraState = "starting" | "live" | "blocked" | "unsupported";

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
}: {
  photos: CapturedPhoto[];
  geo: GeoState;
  place: PlaceName | null;
  onAdd: (photo: CapturedPhoto) => void;
  onRemove: (id: string) => void;
  onSend: () => void;
  onBack: () => void;
  /** Called once the camera is running or was refused, so the location prompt never competes with it. */
  onCameraSettled: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<CameraState>("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [attempt, setAttempt] = useState(0);
  /** "denied" when the browser remembers a refusal: only its site settings can undo it. */
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<CapturedPhoto | null>(null);
  const [now, setNow] = useState(() => new Date());
  const full = photos.length >= MAX_PHOTOS;
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

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera("unsupported");
        return;
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
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setCamera(name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "unsupported");
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
    if (full) return setNotice(`Maximum of ${MAX_PHOTOS} photos. Delete one to take another.`);
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
    if (photos.length && !window.confirm("Leave without sending? Your photos will be discarded.")) e.preventDefault();
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <Camera className="size-12 text-white/60" aria-hidden />
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
                {camera === "blocked" && (permission === "denied" || attempt > 0) ? (
                  <ol className="max-w-xs list-decimal space-y-1 pl-5 text-left text-sm text-white/80">
                    <li>Tap the icon at the left of the web address.</li>
                    <li>
                      Open <b>Permissions</b> (or <b>Site settings</b>) → <b>Camera</b> → <b>Allow</b>.
                    </li>
                    <li>Come back and tap Try again.</li>
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
              className="flex size-11 items-center justify-center rounded-full bg-black/45 backdrop-blur"
            >
              <RefreshCw className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Live GPS stamp (burned into each photo) */}
        {stamp ? (
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

      <ControlBar className="pb-3">
        <BarTile label="Home" href={PUBLIC_ROUTES.commandCenter} align="start" onClick={leaveHome}>
          <Home className="size-8" aria-hidden />
        </BarTile>
        <ShutterButton label="Take photo" onClick={() => void shoot()} busy={busy} disabled={full} />
        <BarTile label="Send" onClick={onSend} disabled={!photos.length} badge={photos.length || undefined} align="end">
          <SendHorizontal className="size-8" aria-hidden />
        </BarTile>
      </ControlBar>

      {/* Captures (max 5) */}
      <div className="shrink-0 bg-black px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1.5">
          {Array.from({ length: MAX_PHOTOS }, (_, i) => {
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
          {photos.length}/{MAX_PHOTOS} photos · tap a photo to view or delete
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
