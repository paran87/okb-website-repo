"use client";

import { Camera, ClipboardList, Home, MapPin, MessageSquareWarning, Send, ShieldAlert } from "lucide-react";
import { FeedbackButton } from "@/features/feedback/components/feedback-dialog";
import { FLOOD_SEVERITY, SEVERITY_ORDER } from "@/features/incident/lib/flood-severity";
import { LIVE_RAIN_MIN_HOURS, MOBILE_EXPIRY_HOURS } from "../lib/expiry";
import { FLOOD_LEVELS, formatDepth, MAX_PHOTOS, roadStatus, WEATHER } from "../lib/options";
import { BottomSheet } from "./bottom-sheet";
import { CLEARED_COLOR, RECEDED_COLOR } from "./flood-map";

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
              <span className="size-4 shrink-0 rounded-full" style={{ background: CLEARED_COLOR }} />
              <span className="font-semibold text-slate-900">Cleared</span>
              <span className="text-slate-500">No update; its time ran out (24h, 3d, 7d)</span>
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

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Change or delete your report</h3>
          <p className="text-sm text-slate-600">
            Tap <b>Mine</b> at the top of the map (or your report on the map) to say the flood has receded, edit the details, delete or
            add photos, or delete the report. Only the phone and browser it was sent from can change it.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">When a report leaves the map</h3>
          <p className="text-sm text-slate-600">
            A report stays on the map until the time the flood receded, if the sender gave one. Otherwise it is cleared
            automatically, depending on the weather in the report:
          </p>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 text-sm">
            {WEATHER.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-0">
                <span className="text-slate-900">
                  <span aria-hidden className="mr-1.5">
                    {w.emoji}
                  </span>
                  {w.label}
                </span>
                <span className="font-semibold text-slate-900">{MOBILE_EXPIRY_HOURS[w.id]} hours</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            While PAGASA reports rain or a warning for Metro Manila, every report stays at least {LIVE_RAIN_MIN_HOURS} hours. Older
            reports stay visible under 24h, 3d and 7d.
          </p>
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

        <FeedbackButton className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 active:bg-slate-100">
          <MessageSquareWarning className="size-5" aria-hidden />
          Report a problem with this page
        </FeedbackButton>
      </div>
    </BottomSheet>
  );
}
