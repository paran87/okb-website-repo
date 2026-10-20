"use client";

import { Camera, ClipboardList, Home, MapPin, Send, ShieldAlert } from "lucide-react";
import { FLOOD_SEVERITY, SEVERITY_ORDER } from "@/features/incident/lib/flood-severity";
import { FLOOD_LEVELS, formatDepth, MAX_PHOTOS, roadStatus } from "../lib/options";
import { BottomSheet } from "./bottom-sheet";
import { RECEDED_COLOR } from "./flood-map";

const STEPS = [
  { icon: Camera, title: "Take photos of the flood", text: `Tap the round button. Take up to ${MAX_PHOTOS} photos; each one is stamped with the time and GPS location.` },
  { icon: Send, title: "Tap send", text: "The arrow button opens a short form once you have at least one photo." },
  { icon: ClipboardList, title: "Fill in the details", text: "Flood height, road condition, weather and when it started. Your name is optional." },
  { icon: MapPin, title: "See it on the map", text: "Your report appears on the map right away. OKB operators verify it from your photos." },
];

/** How to use the page, what the map colors mean, and safety notes. */
export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="How to report a flood">
      <div className="space-y-5 pb-2">
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <s.icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  {i + 1}. {s.title}
                </p>
                <p className="text-sm text-slate-600">{s.text}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-black ring-1 ring-slate-300">
              <Home className="size-5" aria-hidden />
            </span>
            <p className="self-center text-sm text-slate-600">The home button goes back to the OKB Command Center dashboard.</p>
          </li>
        </ol>

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Map colors</h3>
          <ul className="space-y-1.5">
            {SEVERITY_ORDER.map((s) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className="size-4 shrink-0 rounded-full" style={{ background: FLOOD_SEVERITY[s].color }} />
                <span className="font-semibold text-slate-900">{FLOOD_SEVERITY[s].label}</span>
                <span className="text-slate-500">{FLOOD_SEVERITY[s].range}</span>
              </li>
            ))}
            <li className="flex items-center gap-3 text-sm">
              <span className="size-4 shrink-0 rounded-full" style={{ background: RECEDED_COLOR }} />
              <span className="font-semibold text-slate-900">Receded</span>
              <span className="text-slate-500">The flood has gone down</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">✓</span>
              <span className="font-semibold text-slate-900">Verified</span>
              <span className="text-slate-500">Checked by OKB operators</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Flood height guide (MMDA)</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {FLOOD_LEVELS.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0">
                <span className="font-semibold text-slate-900">{l.label}</span>
                <span className="text-right text-slate-500">
                  {l.inches} · {formatDepth(l.meters)}
                  <span className="block text-xs">{roadStatus(l.road)?.short}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex gap-3 rounded-2xl bg-red-50 p-3">
          <ShieldAlert className="size-6 shrink-0 text-red-600" aria-hidden />
          <div className="text-sm text-red-900">
            <p className="font-bold">Stay safe</p>
            <p>
              Take photos from a safe, dry place. Never wade into floodwater or go near rivers and drainage to take a picture. In an
              emergency call <a href="tel:911" className="font-bold underline">911</a>.
            </p>
          </div>
        </section>

        <p className="text-xs text-slate-500">
          Your photos, the place and the flood details are shown on the public map. Your mobile number (if you give it) is seen only by
          OKB operators. The page needs your camera and location; nothing is recorded until you tap send.
        </p>
      </div>
    </BottomSheet>
  );
}
