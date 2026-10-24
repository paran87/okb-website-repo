"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Check, MapPin, Play, SendHorizontal } from "lucide-react";
import { FLOOD_SEVERITY, floodSeverity } from "@/features/incident/lib/flood-severity";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import {
  FLOOD_LEVELS,
  formatCoordinates,
  formatDepth,
  NCR_DEOS,
  ROAD_STATUSES,
  WEATHER,
  type FloodLevelId,
  type RoadStatusId,
  type WeatherId,
} from "../lib/options";
import type { FloodReportFormValues, FloodReportInput, PlaceName } from "../types";
import { EditLink } from "./my-report";

export type ReportFormValues = Omit<FloodReportInput, "id" | "photos" | "videos">;

/** A photo shown at the top of the form (a new capture, or a photo already sent). */
export interface FormPhoto {
  id: string;
  url: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  takenAt: string | null;
}

/** "YYYY-MM-DDTHH:mm" in the phone's time zone, for <input type="datetime-local">. */
function localInput(date: Date): string {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  const t = new Date(value);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

function Section({ title, hint, children, error }: { title: string; hint?: string; children: ReactNode; error?: string | null }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
      </div>
      {children}
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
    </section>
  );
}

const input =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20";

function Chip({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors",
        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-800 active:bg-slate-100",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** The short form shown after tapping send; with `initial`, the same form edits a report already sent. */
export function ReportForm({
  photos,
  place,
  error,
  onBack,
  onSubmit,
  initial,
  editHeading,
  videoCount = 0,
}: {
  photos: FormPhoto[];
  /** The last `videoCount` of `photos` are video thumbnails (counted as videos on the send button). */
  videoCount?: number;
  place: PlaceName | null;
  error: string | null;
  onBack: () => void;
  onSubmit: (values: ReportFormValues) => void;
  /** Editing: the report's current answers (its location stays where it was reported). */
  initial?: FloodReportFormValues;
  /** Header when editing, e.g. for operators (default "Edit your report"). */
  editHeading?: { title: string; subtitle: string };
}) {
  const editing = Boolean(initial);
  // The most accurate photo position is the report's location.
  const spot = useMemo(() => {
    if (initial) return { latitude: initial.latitude, longitude: initial.longitude, accuracyM: initial.accuracyM };
    const best = [...photos]
      .filter((p) => p.latitude !== null && p.longitude !== null)
      .sort((a, b) => (a.accuracyM ?? 9999) - (b.accuracyM ?? 9999))[0];
    return best ? { latitude: best.latitude as number, longitude: best.longitude as number, accuracyM: best.accuracyM } : null;
  }, [photos, initial]);
  const earliest = useMemo(
    () => new Date(Math.min(...photos.map((p) => (p.takenAt ? Date.parse(p.takenAt) : Date.now())), Date.now())),
    [photos],
  );

  const [locationText, setLocationText] = useState(initial?.locationText ?? place?.road ?? place?.label ?? "");
  const [landmark, setLandmark] = useState(initial?.landmark ?? "");
  // "" = not sure (left blank), one of the Metro Manila DEOs, or "other" (typed in).
  const [deoChoice, setDeoChoice] = useState<string>(() =>
    !initial?.deo ? "" : (NCR_DEOS as readonly string[]).includes(initial.deo) ? initial.deo : "other",
  );
  const [deoOther, setDeoOther] = useState(() => (initial?.deo && !(NCR_DEOS as readonly string[]).includes(initial.deo) ? initial.deo : ""));
  const [level, setLevel] = useState<FloodLevelId | null>(initial?.level ?? null);
  const [depthCm, setDepthCm] = useState(initial?.depthCm ? String(initial.depthCm) : "");
  const [road, setRoad] = useState<RoadStatusId | null>(initial?.roadStatus ?? null);
  const [roadTouched, setRoadTouched] = useState(editing);
  const [sky, setSky] = useState<WeatherId | null>(initial?.weather ?? null);
  const [startedAt, setStartedAt] = useState(() => localInput(initial ? new Date(initial.startedAt) : earliest));
  const [receded, setReceded] = useState(Boolean(initial?.recededAt));
  const [recededAt, setRecededAt] = useState(() => localInput(initial?.recededAt ? new Date(initial.recededAt) : new Date()));
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [name, setName] = useState(initial?.senderName ?? "");
  const [contact, setContact] = useState(initial?.contactNumber ?? "");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // DEO of the nearest national road (from the place lookup): offered, never filled in on its own.
  const nearest = place?.nearestDeo ?? null;

  // The street name may arrive after the form opens; fill it in unless the sender already typed one.
  const suggested = place?.road ?? place?.label ?? "";
  useEffect(() => {
    if (suggested && !editing) setLocationText((current) => current || suggested);
  }, [suggested, editing]);

  // A field's message goes away as soon as it is answered.
  const clear = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e;
      const { [key]: _gone, ...rest } = e;
      void _gone;
      return rest;
    });

  const chooseLevel = (id: FloodLevelId) => {
    clear("level");
    setLevel(id);
    if (!roadTouched) setRoad(FLOOD_LEVELS.find((l) => l.id === id)?.road ?? null);
  };

  const quickStart = (minutesAgo: number) => {
    clear("time");
    setStartedAt(localInput(new Date(Date.now() - minutesAgo * 60_000)));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    const started = fromLocalInput(startedAt);
    const recededIso = receded ? fromLocalInput(recededAt) : null;
    const cm = depthCm.trim() ? Number(depthCm) : null;
    if (locationText.trim().length < 2) next.location = "Enter the street or place.";
    if (!level) next.level = "Choose the flood height.";
    if (cm !== null && (!Number.isFinite(cm) || cm < 1 || cm > 1000)) next.level = "Enter the depth in centimeters (1–1000).";
    if (!road) next.road = "Choose the road condition.";
    if (!sky) next.weather = "Choose the weather.";
    if (!started) next.time = "Enter when the flood started.";
    else if (Date.parse(started) > Date.now() + 5 * 60_000) next.time = "The start time cannot be in the future.";
    if (receded && !recededIso) next.time = "Enter when the flood receded.";
    if (started && recededIso && Date.parse(recededIso) < Date.parse(started)) next.time = "The flood cannot recede before it started.";
    if (recededIso && Date.parse(recededIso) > Date.now() + 5 * 60_000) next.time = "The receded time cannot be in the future.";
    if (contact.trim() && !/^\+?[0-9\s-]{7,20}$/.test(contact.trim())) next.contact = "Enter a valid mobile number, or leave it empty.";
    setErrors(next);
    if (Object.keys(next).length || !spot || !level || !road || !sky || !started) {
      requestAnimationFrame(() =>
        document.querySelector("[data-form-error]")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }
    onSubmit({
      latitude: spot.latitude,
      longitude: spot.longitude,
      accuracyM: spot.accuracyM,
      locationText: locationText.trim(),
      landmark: landmark.trim() || null,
      place: initial ? initial.place : place,
      deo: deoChoice === "other" ? deoOther.trim() || null : deoChoice || null,
      level,
      depthCm: cm,
      roadStatus: road,
      weather: sky,
      startedAt: started,
      recededAt: recededIso,
      remarks: remarks.trim() || null,
      senderName: name.trim() || null,
      contactNumber: contact.trim() || null,
      website,
    });
  };

  const err = (key: string) => (errors[key] ? errors[key] : null);
  const firstError = Object.keys(errors)[0];

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-100 text-slate-900">
      <header className="flex shrink-0 items-center gap-2 bg-black px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={onBack}
          aria-label={editing ? "Cancel editing" : "Back to camera"}
          className="flex size-11 items-center justify-center rounded-full bg-white/15"
        >
          <ArrowLeft className="size-6" aria-hidden />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight">{editing ? (editHeading?.title ?? "Edit your report") : "Flood details"}</h2>
          <p className="text-xs text-white/70">
            {editing ? (editHeading?.subtitle ?? "Your changes show on the map right away") : "A few taps, then send"}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-md space-y-6 px-4 py-4">
          {/* Photos */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {photos.map((p, i) => {
              const isVideo = i >= photos.length - videoCount;
              return (
                <span key={p.id} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL or our photo route */}
                  <img src={p.url} alt={isVideo ? "Video" : `Photo ${i + 1}`} className="h-20 w-28 rounded-lg object-cover ring-1 ring-slate-300" />
                  {isVideo ? (
                    <span className="absolute inset-0 m-auto grid size-8 place-items-center rounded-full bg-black/60 text-white" aria-hidden>
                      <Play className="size-4 translate-x-px fill-white" />
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>

          <div data-form-error={firstError === "location" ? "" : undefined}>
            <Section title="Where is the flood?" error={err("location")}>
              <input
                className={input}
                value={locationText}
                onChange={(e) => {
                  clear("location");
                  setLocationText(e.target.value);
                }}
                placeholder="Street or place, e.g. España Blvd"
                maxLength={200}
                autoComplete="off"
              />
              <input
                className={input}
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Nearest landmark or corner (optional)"
                maxLength={200}
                autoComplete="off"
              />
              {spot ? (
                <p className="flex items-start gap-1.5 text-sm text-slate-500">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                  <span>
                    {place ? `${place.label} · ` : ""}
                    {formatCoordinates(spot.latitude, spot.longitude, 5)}
                    {spot.accuracyM !== null ? ` (±${Math.round(spot.accuracyM)} m)` : ""}
                  </span>
                </p>
              ) : null}
            </Section>
          </div>

          <Section title="DPWH District Engineering Office (DEO)" hint="Optional. Choose it if you know which DEO covers this area.">
            <select
              className={input}
              value={deoChoice}
              onChange={(e) => setDeoChoice(e.target.value)}
              aria-label="District Engineering Office"
            >
              <option value="">Not sure (leave blank)</option>
              {NCR_DEOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value="other">Other DEO…</option>
            </select>
            {deoChoice === "other" ? (
              <input
                className={input}
                value={deoOther}
                onChange={(e) => setDeoOther(e.target.value)}
                placeholder="DEO name, e.g. Rizal 1st DEO"
                maxLength={120}
                autoComplete="off"
                aria-label="Other District Engineering Office"
              />
            ) : null}
            {nearest && !deoChoice ? (
              <button
                type="button"
                onClick={() => {
                  if ((NCR_DEOS as readonly string[]).includes(nearest)) setDeoChoice(nearest);
                  else {
                    setDeoChoice("other");
                    setDeoOther(nearest);
                  }
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-left text-sm text-blue-800 active:bg-blue-100"
              >
                <MapPin className="size-4 shrink-0" aria-hidden />
                <span>
                  Nearest national road is under <b>{nearest}</b>. Tap to use it.
                </span>
              </button>
            ) : null}
          </Section>

          <div data-form-error={firstError === "level" ? "" : undefined}>
            <Section title="How deep is the flood?" hint="Compare with the gutter, tires or your body." error={err("level")}>
              <div role="radiogroup" aria-label="Flood height" className="grid grid-cols-2 gap-2">
                {FLOOD_LEVELS.map((l) => (
                  <Chip key={l.id} active={level === l.id} onClick={() => chooseLevel(l.id)} className="flex items-center gap-2.5">
                    <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: FLOOD_SEVERITY[floodSeverity(l.meters)].color }} />
                    <span>
                      {l.label}
                      <span className={cn("block text-xs font-normal", level === l.id ? "text-white/75" : "text-slate-500")}>
                        {l.inches} · {formatDepth(l.meters)}
                      </span>
                    </span>
                  </Chip>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="shrink-0">Exact depth if measured:</span>
                <input
                  className={cn(input, "h-11 w-24")}
                  inputMode="numeric"
                  value={depthCm}
                  onChange={(e) => {
                    clear("level");
                    setDepthCm(e.target.value.replace(/[^\d]/g, "").slice(0, 4));
                  }}
                  placeholder="cm"
                  aria-label="Exact depth in centimeters"
                />
                <span>cm</span>
              </label>
            </Section>
          </div>

          <div data-form-error={firstError === "road" ? "" : undefined}>
            <Section title="Can vehicles pass?" error={err("road")}>
              <div role="radiogroup" aria-label="Road condition" className="grid gap-2">
                {ROAD_STATUSES.map((r) => (
                  <Chip
                    key={r.id}
                    active={road === r.id}
                    onClick={() => {
                      clear("road");
                      setRoad(r.id);
                      setRoadTouched(true);
                    }}
                  >
                    {r.label}
                  </Chip>
                ))}
              </div>
            </Section>
          </div>

          <div data-form-error={firstError === "weather" ? "" : undefined}>
            <Section title="Weather right now" error={err("weather")}>
              <div role="radiogroup" aria-label="Weather" className="grid grid-cols-2 gap-2">
                {WEATHER.map((w) => (
                  <Chip
                    key={w.id}
                    active={sky === w.id}
                    onClick={() => {
                      clear("weather");
                      setSky(w.id);
                    }}
                  >
                    <span aria-hidden className="mr-1.5">
                      {w.emoji}
                    </span>
                    {w.label}
                  </Chip>
                ))}
              </div>
            </Section>
          </div>

          <div data-form-error={firstError === "time" ? "" : undefined}>
            <Section title="When did the flood start?" error={err("time")}>
              <input type="datetime-local" className={input} value={startedAt} max={localInput(new Date())} onChange={(e) => {
                  clear("time");
                  setStartedAt(e.target.value);
                }}
              />
              <div className="flex flex-wrap gap-2">
                {[
                  ["Just now", 0],
                  ["30 min ago", 30],
                  ["1 hr ago", 60],
                  ["2 hrs ago", 120],
                  ["3 hrs ago", 180],
                ].map(([label, minutes]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => quickStart(minutes as number)}
                    className="h-10 rounded-full border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 active:bg-slate-100"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div role="radiogroup" aria-label="Has the flood receded?" className="grid grid-cols-2 gap-2 pt-1">
                <Chip active={!receded} onClick={() => setReceded(false)}>
                  Still flooded
                </Chip>
                <Chip active={receded} onClick={() => setReceded(true)}>
                  Already receded
                </Chip>
              </div>
              {receded ? (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-600">Time the flood receded</span>
                  <input type="datetime-local" className={input} value={recededAt} max={localInput(new Date())} onChange={(e) => {
                      clear("time");
                      setRecededAt(e.target.value);
                    }}
                  />
                </label>
              ) : null}
            </Section>
          </div>

          <Section title="Remarks" hint="Optional: stranded vehicles, clogged drainage, rising water… Written in the OKB flood report (PDF).">
            <textarea
              className={cn(input, "h-24 resize-none py-3")}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              maxLength={1000}
              placeholder="Remarks (optional)"
              aria-label="Remarks"
            />
          </Section>

          <div data-form-error={firstError === "contact" ? "" : undefined}>
            <Section title="About you" hint="Optional. Leave empty to report anonymously." error={err("contact")}>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" maxLength={80} autoComplete="name" />
              <input
                className={input}
                value={contact}
                onChange={(e) => {
                  clear("contact");
                  setContact(e.target.value);
                }}
                placeholder="Mobile number (optional)"
                inputMode="tel"
                maxLength={20}
                autoComplete="tel"
              />
              <p className="text-xs text-slate-500">Your name is shown with the report. Your number is seen only by OKB operators.</p>
            </Section>
          </div>

          {/* Honeypot for bots; hidden from people and screen readers. */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="absolute -left-[9999px] h-px w-px opacity-0"
            name="website"
          />

          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
          <p className="text-xs text-slate-500">
            {editing
              ? "To add or remove photos, use Manage photos on your report."
              : (
                <>
                  By sending, you agree that your photos and these details are shown on the public flood map and used by the OKB Command Center.{" "}
                  <a href={PUBLIC_ROUTES.privacyPolicy} target="_blank" rel="noopener" className="font-semibold text-blue-700 underline">
                    Privacy Policy
                  </a>
                </>
              )}
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={submit}
          className="mx-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-black text-base font-bold text-white active:bg-slate-800"
        >
          <SendHorizontal className="size-5" aria-hidden />
          {editing
            ? "Save changes"
            : `Send report · ${[
                photos.length - videoCount ? `${photos.length - videoCount} photo${photos.length - videoCount === 1 ? "" : "s"}` : null,
                videoCount ? `${videoCount} video` : null,
              ]
                .filter(Boolean)
                .join(" · ")}`}
        </button>
      </div>
    </div>
  );
}

/** Upload / save progress, then the confirmation. */
export function SendProgress({
  stage,
  progress,
  total,
  reference,
  inConsolidated = false,
  edit = null,
  onViewMap,
  onAnother,
}: {
  stage: "uploading" | "saving" | "done";
  /** The sent report's id and edit key, for its edit link. */
  edit?: { id: string; token: string } | null;
  progress: number;
  total: number;
  reference: string | null;
  /** Goes into the automated WhatsApp report (a test address while that is tested). */
  inConsolidated?: boolean;
  onViewMap: () => void;
  onAnother: () => void;
}) {
  if (stage === "done") {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center gap-5 overflow-y-auto bg-black px-8 py-8 text-center text-white [justify-content:safe_center] [&>*]:shrink-0">
        <span className="flex size-20 items-center justify-center rounded-full bg-emerald-500">
          <Check className="size-11" strokeWidth={3} aria-hidden />
        </span>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Report sent. Salamat!</h2>
          <p className="text-white/75">Your report is now on the flood map. OKB operators will verify it from your photos.</p>
          <p className="text-sm text-white/60">
            Tap <b className="text-white">Mine</b> on the map to mark it receded, edit it or delete it. Only this browser, or your edit link,
            can change it.
          </p>
          {reference ? <p className="font-mono text-sm text-amber-300">{reference}</p> : null}
          {inConsolidated ? (
            <p className="rounded-xl bg-white/10 px-3 py-2 text-sm text-emerald-300">
              Included in the next automated WhatsApp report (text and PDF with your photos).
            </p>
          ) : null}
        </div>
        {edit ? (
          <div className="w-full max-w-xs">
            <EditLink id={edit.id} token={edit.token} dark />
          </div>
        ) : null}
        <div className="grid w-full max-w-xs gap-3">
          <button type="button" onClick={onViewMap} className="h-14 rounded-2xl bg-white text-base font-bold text-black">
            View on map
          </button>
          <button type="button" onClick={onAnother} className="h-12 rounded-2xl border border-white/30 font-semibold">
            Report another flood
          </button>
        </div>
      </div>
    );
  }
  const pct = Math.round(progress * 100);
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black/90 px-8 text-center text-white" role="status">
      <SendHorizontal className="size-10 animate-pulse" aria-hidden />
      <div className="space-y-1">
        <p className="text-lg font-bold">{stage === "uploading" ? `Uploading…` : "Saving your report…"}</p>
        <p className="text-sm text-white/70">
          {stage === "uploading" ? `${Math.round(progress * 100)}% · ${total} file${total === 1 ? "" : "s"}` : "Almost done"}
        </p>
      </div>
      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-amber-400 transition-[width] duration-200" style={{ width: `${stage === "saving" ? 100 : pct}%` }} />
      </div>
      <p className="text-xs text-white/50">Keep this page open.</p>
    </div>
  );
}
