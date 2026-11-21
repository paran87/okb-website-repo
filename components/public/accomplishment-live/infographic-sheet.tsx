"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  Droplets,
  FileDown,
  Home,
  RefreshCw,
  Settings2,
  Share2,
  Sparkles,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Sheet } from "@/components/public/accomplishment-live/shared";
import type {
  RecordType,
  RollupMode,
} from "@/features/accomplishment/lib/rollup";

const TYPES: { value: RecordType; label: string; icon: LucideIcon }[] = [
  { value: "waterway", label: "Waterways", icon: Waves },
  { value: "drainage", label: "Drainage", icon: Droplets },
  { value: "isf", label: "ISF", icon: Home },
];

const STEPS = [
  "Reading the latest figures",
  "Drawing the map and charts",
  "Writing the highlights",
  "Adding field photos",
  "Putting it together",
];

interface Made {
  url: string;
  blob: Blob;
  filename: string;
  by: "ai" | "rules";
  /** The settings it was made with. */
  key: string;
}

type State =
  | { kind: "idle" }
  | { kind: "loading"; key: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; made: Made };

function filenameOf(res: Response): string {
  const m = /filename="([^"]+)"/.exec(
    res.headers.get("content-disposition") ?? "",
  );
  return (
    m?.[1] ?? `okb-accomplishment-${new Date().toISOString().slice(0, 10)}.png`
  );
}

/** Opens the image in a print window sized to it, so "Save as PDF" gives one tall page. */
function printPdf(made: Made, width: number, height: number) {
  const win = window.open("", "_blank");
  if (!win) return;
  const pageH = Math.round((210 * height) / Math.max(width, 1));
  win.document
    .write(`<!doctype html><html><head><meta charset="utf-8"><title>${made.filename.replace(/\.png$/, "")}</title>
<style>@page{size:210mm ${pageH}mm;margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;width:210mm;height:${pageH}mm}</style></head>
<body><img src="${made.url}" alt="OKB accomplishment infographic"><script>const i=document.images[0];const go=()=>setTimeout(()=>window.print(),150);i.complete?go():i.onload=go;</script></body></html>`);
  win.document.close();
}

/** "Infographic": the accomplishment summary for the chosen record types and regions, as a shareable picture. */
export function InfographicSheet({
  open,
  onClose,
  regions,
  initialRegions,
  initialTypes,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  /** Every region on the dashboard, in the order shown. */
  regions: { key: string; code: string }[];
  /** Regions opened in the list (empty = all regions). */
  initialRegions: string[];
  initialTypes: RecordType[];
  mode: RollupMode;
}) {
  const [types, setTypes] = useState<RecordType[]>(initialTypes);
  const [picked, setPicked] = useState<string[]>(initialRegions);
  const [ai, setAi] = useState(true);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [step, setStep] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [canShare, setCanShare] = useState(false);
  /** The settings are folded into one line until "Change" is tapped (on a phone they would fill the screen). */
  const [editing, setEditing] = useState(false);
  /** False once the server says it has no AI key. */
  const [aiAvailable, setAiAvailable] = useState(true);
  const abort = useRef<AbortController | null>(null);
  const madeRef = useRef<Made | null>(null);

  const key = useMemo(() => {
    const p = new URLSearchParams({
      types: types.join(","),
      mode,
      ai: ai ? "1" : "0",
    });
    if (picked.length) p.set("regions", picked.join(","));
    return p.toString();
  }, [types, picked, mode, ai]);

  const make = useCallback(async (query: string) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setState({ kind: "loading", key: query });
    setStep(0);
    setSize(null);
    try {
      const res = await fetch(`/api/accomplishment/infographic?${query}`, {
        signal: ctrl.signal,
      });
      if (!res.ok)
        throw new Error(
          (await res.text().catch(() => "")) ||
            "The infographic could not be made.",
        );
      const blob = await res.blob();
      if (res.headers.get("x-highlights-ai") === "off") setAiAvailable(false);
      const made: Made = {
        url: URL.createObjectURL(blob),
        blob,
        filename: filenameOf(res),
        by: res.headers.get("x-highlights-by") === "ai" ? "ai" : "rules",
        key: query,
      };
      if (madeRef.current) URL.revokeObjectURL(madeRef.current.url);
      madeRef.current = made;
      setState({ kind: "ready", made });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setState({
        kind: "error",
        message:
          err instanceof Error && err.message.length < 160
            ? err.message
            : "The infographic could not be made. Try again in a moment.",
      });
    }
  }, []);

  // Make one as soon as the sheet opens, with the dashboard's settings.
  useEffect(() => {
    if (!open) return;
    setTypes(initialTypes);
    setPicked(initialRegions);
    const p = new URLSearchParams({
      types: initialTypes.join(","),
      mode,
      ai: "1",
    });
    if (initialRegions.length) p.set("regions", initialRegions.join(","));
    setAi(true);
    setEditing(false);
    void make(p.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the sheet opens
  }, [open]);

  useEffect(
    () => () => {
      abort.current?.abort();
      if (madeRef.current) URL.revokeObjectURL(madeRef.current.url);
    },
    [],
  );

  // The steps shown while it is being made.
  useEffect(() => {
    if (state.kind !== "loading") return;
    const id = window.setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      1800,
    );
    return () => window.clearInterval(id);
  }, [state.kind]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    try {
      const file = new File([state.made.blob], state.made.filename, {
        type: "image/png",
      });
      setCanShare(
        typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] }),
      );
    } catch {
      setCanShare(false);
    }
  }, [state]);

  const close = () => {
    abort.current?.abort();
    onClose();
  };

  const toggleType = (t: RecordType) =>
    setTypes((prev) =>
      prev.includes(t)
        ? prev.length === 1
          ? prev
          : prev.filter((x) => x !== t)
        : [...prev, t],
    );
  const toggleRegion = (k: string) =>
    setPicked((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );

  const made = state.kind === "ready" ? state.made : null;
  const changed =
    state.kind === "ready" ? state.made.key !== key : state.kind !== "loading";

  const share = async () => {
    if (!made) return;
    try {
      await navigator.share({
        files: [new File([made.blob], made.filename, { type: "image/png" })],
        title: "Oplan Kontra Baha accomplishment",
      });
    } catch {
      /* cancelled */
    }
  };

  const chip = (on: boolean) =>
    cn(
      "inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors",
      on
        ? "border-[var(--dpwh-blue)] bg-[var(--dpwh-blue)] text-white"
        : "border-[var(--dpwh-border)] bg-white text-[var(--dpwh-muted)] hover:text-[var(--dpwh-blue-dark)]",
    );

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Infographic"
      subtitle="A picture of the accomplishment to download, share or print"
      wide
    >
      <div className="space-y-4">
        {/* Settings */}
        {!editing ? (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--dpwh-border)] bg-white py-1.5 pr-1.5 pl-3">
            <p className="min-w-0 flex-1 text-sm leading-snug font-semibold text-[var(--dpwh-blue-dark)]">
              {types
                .map((t) => TYPES.find((x) => x.value === t)?.label)
                .join(" + ")}{" "}
              ·{" "}
              {picked.length
                ? regions
                    .filter((r) => picked.includes(r.key))
                    .map((r) => r.code.replace(/^Region /, ""))
                    .join(", ")
                : "All regions"}
              {aiAvailable && ai ? (
                <span className="font-normal text-[var(--dpwh-muted)]">
                  {" "}
                  · AI highlights
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--dpwh-border)] px-3 text-xs font-bold text-[var(--dpwh-blue-dark)] hover:border-[var(--dpwh-blue)]"
            >
              <Settings2 className="size-4" aria-hidden /> Change
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-[var(--dpwh-border)] bg-white p-3">
            <div>
              <p className="mb-1.5 text-[11px] font-extrabold tracking-[0.12em] text-[var(--dpwh-muted)] uppercase">
                Records
              </p>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Record types"
              >
                {TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={types.includes(value)}
                    onClick={() => toggleType(value)}
                    className={chip(types.includes(value))}
                  >
                    <Icon className="size-3.5" aria-hidden /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-extrabold tracking-[0.12em] text-[var(--dpwh-muted)] uppercase">
                Regions
              </p>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Regions"
              >
                <button
                  type="button"
                  aria-pressed={!picked.length}
                  onClick={() => setPicked([])}
                  className={chip(!picked.length)}
                >
                  {!picked.length ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : null}{" "}
                  All regions
                </button>
                {regions.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={picked.includes(r.key)}
                    onClick={() => toggleRegion(r.key)}
                    className={chip(picked.includes(r.key))}
                  >
                    {r.code.replace(/^Region /, "")}
                  </button>
                ))}
              </div>
            </div>
            {aiAvailable ? (
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-[var(--dpwh-orange-light)] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={ai}
                  onChange={(e) => setAi(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--dpwh-orange)]"
                />
                <span className="text-xs leading-snug text-[var(--dpwh-text)]">
                  <span className="flex items-center gap-1 font-bold text-[var(--dpwh-orange-dark)]">
                    <Sparkles className="size-3.5" aria-hidden /> Highlights
                    written with AI
                  </span>
                  Claude writes the headline and three highlights from the
                  figures. Any number that is not one of the figures is
                  rejected, and plain highlights are used instead.
                </span>
              </label>
            ) : null}
            {changed ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  void make(key);
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--dpwh-blue-dark)] text-sm font-bold text-white"
              >
                <RefreshCw className="size-4" aria-hidden />{" "}
                {state.kind === "idle"
                  ? "Make infographic"
                  : "Update infographic"}
              </button>
            ) : null}
          </div>
        )}

        {/* Result */}
        {state.kind === "loading" ? (
          <div
            className="okb-ig-building flex flex-col items-center rounded-xl border border-[var(--dpwh-border)] bg-white px-4 py-8 text-center"
            role="status"
            aria-live="polite"
          >
            <BuildingArt />
            <p className="font-display mt-4 text-lg font-bold tracking-wide text-[var(--dpwh-blue-dark)] uppercase">
              Making your infographic
            </p>
            <ol className="mt-3 w-full max-w-xs space-y-1.5 text-left text-sm">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex items-center gap-2 transition-opacity",
                    i > step ? "opacity-35" : "opacity-100",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      i < step
                        ? "bg-[#16a34a] text-white"
                        : i === step
                          ? "okb-ig-pulse bg-[var(--dpwh-orange)] text-white"
                          : "bg-[#e3e8ef] text-[var(--dpwh-muted)]",
                    )}
                  >
                    {i < step ? (
                      <Check className="size-3" aria-hidden />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={
                      i === step
                        ? "font-semibold text-[var(--dpwh-text)]"
                        : "text-[var(--dpwh-muted)]"
                    }
                  >
                    {s === "Writing the highlights" && ai
                      ? "Writing the highlights with AI"
                      : s}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-xl border border-[var(--dpwh-border)] bg-white p-6 text-center">
            <AlertTriangle
              className="mx-auto size-8 text-[var(--dpwh-orange)]"
              aria-hidden
            />
            <p className="mt-2 text-sm text-[var(--dpwh-text)]">
              {state.message}
            </p>
            <button
              type="button"
              onClick={() => void make(key)}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--dpwh-blue-dark)] px-5 text-sm font-bold text-white"
            >
              <RefreshCw className="size-4" aria-hidden /> Try again
            </button>
          </div>
        ) : made ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <a
                href={made.url}
                download={made.filename}
                className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--dpwh-orange)] px-4 text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgba(245,126,32,0.8)] sm:col-span-1"
              >
                <Download className="size-4" aria-hidden /> Download PNG
              </a>
              {canShare ? (
                <button
                  type="button"
                  onClick={() => void share()}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--dpwh-blue)] px-4 text-sm font-bold text-white"
                >
                  <Share2 className="size-4" aria-hidden /> Share
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => printPdf(made, size?.w ?? 1080, size?.h ?? 3900)}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--dpwh-border)] bg-white px-4 text-sm font-bold text-[var(--dpwh-blue-dark)]",
                  !canShare && "col-span-2 sm:col-span-1",
                )}
              >
                <FileDown className="size-4" aria-hidden /> Save as PDF
              </button>
            </div>
            <p className="text-xs text-[var(--dpwh-muted)]">
              {made.by === "ai"
                ? "Highlights written with AI (Claude) from the figures shown. "
                : ai && aiAvailable
                  ? "AI highlights were not available this time, so plain highlights are shown. "
                  : ""}
              Each record counts as at most 100% done. 1080 px wide, ready for
              Facebook, Viber and print.
            </p>
            <div className="okb-ig-reveal relative overflow-hidden rounded-xl border border-[var(--dpwh-border)] bg-white shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL made on this page */}
              <img
                src={made.url}
                alt="Accomplishment infographic: overall progress, highlights, key figures, status, progress map, most silt removed and field photos"
                className="block h-auto w-full"
                onLoad={(e) =>
                  setSize({
                    w: e.currentTarget.naturalWidth,
                    h: e.currentTarget.naturalHeight,
                  })
                }
              />
              <span
                className="okb-ig-shine pointer-events-none absolute inset-0"
                aria-hidden
              />
            </div>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

/** A small animated drawing: bars rising, a ring filling and a map pin dropping, while the image is made. */
function BuildingArt() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-auto" aria-hidden>
      <rect x="6" y="6" width="188" height="108" rx="14" fill="#002855" />
      <rect x="6" y="6" width="188" height="22" rx="14" fill="#0038a8" />
      <rect x="6" y="20" width="188" height="8" fill="#0038a8" />
      <rect x="16" y="13" width="56" height="7" rx="3.5" fill="#fcd116" />
      <circle
        cx="52"
        cy="70"
        r="26"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.15"
        strokeWidth="9"
      />
      <circle
        className="okb-ig-ring"
        cx="52"
        cy="70"
        r="26"
        fill="none"
        stroke="#f57e20"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray="163"
        transform="rotate(-90 52 70)"
      />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          className="okb-ig-bar"
          style={{ animationDelay: `${i * 0.18}s` }}
          x={100 + i * 20}
          y="52"
          width="13"
          height="48"
          rx="3"
          fill={["#fcd116", "#f57e20", "#22c55e", "#38bdf8"][i]}
        />
      ))}
      <g className="okb-ig-pin">
        <path
          d="M172 36c-6 0-10 4.5-10 10 0 7.5 10 17 10 17s10-9.5 10-17c0-5.5-4-10-10-10z"
          fill="#fcd116"
        />
        <circle cx="172" cy="46" r="3.5" fill="#002855" />
      </g>
    </svg>
  );
}
