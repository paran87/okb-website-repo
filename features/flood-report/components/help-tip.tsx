"use client";

import { useEffect, useState } from "react";
import { Camera, CircleCheck, SendHorizontal, X } from "lucide-react";

const DONE_KEY = "okb-report-help-tip-done";

const STEPS = [
  { icon: Camera, text: "Tap the round button and take photos of the flood." },
  { icon: SendHorizontal, text: "Tap Send." },
  { icon: CircleCheck, text: "Answer a few quick questions: how deep, can cars pass? Done!" },
];

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * A speech bubble over the Help button when the page opens: how to send a report in three easy steps. It
 * shows on every visit until the visitor closes it (or opens the full help), and steps aside while
 * anything else is open (`hidden`).
 */
export function HelpTip({ hidden, onShowMe }: { hidden: boolean; onShowMe: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (wasDismissed()) return;
    // A moment after the map appears, so it reads as a hint rather than a pop-up.
    const timer = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      /* private mode: it shows again next visit */
    }
  };

  if (!open || hidden) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 px-5">
      <div className="relative mx-auto max-w-md">
        <section
          role="dialog"
          aria-label="How to send a flood report"
          className="pointer-events-auto ml-auto w-full max-w-[20rem] rounded-2xl bg-white p-3.5 pr-3 text-slate-900 shadow-2xl ring-1 ring-black/10"
        >
          <div className="flex items-start gap-2">
            <p className="flex-1 text-[15px] font-bold leading-snug">
              Sending a flood report is easy
              <span className="block text-xs font-medium text-slate-500">Three steps, under a minute</span>
            </p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close the tip"
              className="-mr-1 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <ol className="mt-2 space-y-2">
            {STEPS.map((s, i) => (
              <li key={s.text} className="flex items-start gap-2.5 text-sm leading-snug text-slate-700">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
                <span className="flex min-w-0 items-start gap-1.5 pt-1">
                  <s.icon className="mt-px size-4 shrink-0 text-slate-400" aria-hidden />
                  {s.text}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                dismiss();
                onShowMe();
              }}
              className="h-10 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 active:bg-slate-100"
            >
              Show me more
            </button>
            <button type="button" onClick={dismiss} className="h-10 rounded-xl bg-slate-900 text-sm font-bold text-white active:bg-slate-700">
              Got it
            </button>
          </div>
        </section>
        {/* Points down at the Help button: same padding and width as the bar, the button's center 28 px from its edge. */}
        <span aria-hidden className="absolute -bottom-2 right-5 size-4 rotate-45 bg-white shadow-[3px_3px_4px_rgba(0,0,0,0.08)]" />
      </div>
    </div>
  );
}
