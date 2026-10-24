"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import {
  areaOfPath,
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_SCREENSHOT_MAX_BYTES,
  type FeedbackCategory,
} from "../lib/options";

/** Screenshots are made smaller in the browser (longest edge, JPEG) so they upload quickly on mobile data. */
const SHOT_EDGE = 1920;

async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, SHOT_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // A format the browser cannot draw: send it as it is (the server accepts JPEG, PNG and WebP).
    return file;
  }
}

type Sent = { reference: string };

/**
 * "Report a problem": a bottom sheet on phones, a dialog on larger screens. Sends the page it was opened on
 * with what the visitor wrote, an optional screenshot and an optional way to reply.
 */
export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() ?? "/";
  const titleId = useId();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  // A sent report starts a fresh form next time.
  useEffect(() => {
    if (open || !sent) return;
    setSent(null);
    setCategory(null);
    setMessage("");
    setContact("");
    setShot((s) => {
      if (s) URL.revokeObjectURL(s.url);
      return null;
    });
  }, [open, sent]);

  const pickShot = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image (a screenshot or photo).");
    const blob = await shrink(file);
    if (blob.size > FEEDBACK_SCREENSHOT_MAX_BYTES) return setError("That image is too large (4 MB at most).");
    setShot((s) => {
      if (s) URL.revokeObjectURL(s.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
  };

  const send = async () => {
    setError(null);
    if (!category) return setError("Choose what kind of problem it is.");
    if (message.trim().length < FEEDBACK_MESSAGE_MIN) return setError("Please describe the problem in a few words.");
    const form = new FormData();
    form.set("category", category);
    form.set("area", areaOfPath(pathname));
    form.set("pageUrl", `${window.location.pathname}${window.location.search}`);
    form.set("pageTitle", document.title.slice(0, 300));
    form.set("message", message.trim());
    form.set("contact", contact.trim());
    form.set("screen", `${window.screen.width}x${window.screen.height}`);
    form.set("website", honeypot.current?.value ?? "");
    if (shot) form.set("screenshot", shot.blob, shot.blob.type === "image/jpeg" ? "screenshot.jpg" : "screenshot");
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as { success?: boolean; data?: Sent; error?: { message?: string } } | null;
      if (!res.ok || !body?.success || !body.data) throw new Error(body?.error?.message ?? "Your report could not be sent. Please try again.");
      setSent(body.data);
    } catch (err) {
      setError(err instanceof TypeError ? "No connection. Check your internet and try again." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={cn("fixed inset-0 z-[70]", open ? "pointer-events-auto" : "pointer-events-none")} inert={!open}>
      <div className={cn("absolute inset-0 bg-black/50 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-white text-slate-900 shadow-2xl transition-transform duration-300 ease-out",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-full sm:max-w-lg sm:rounded-3xl",
          open ? "translate-y-0 sm:-translate-x-1/2 sm:-translate-y-1/2" : "translate-y-[105%] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:opacity-0",
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 id={titleId} className="text-lg font-bold">
            Report a problem
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:bg-slate-200"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {sent ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <CheckCircle2 className="size-14 text-emerald-600" aria-hidden />
            <p className="text-lg font-bold">Thank you!</p>
            <p className="text-[15px] text-slate-600">
              Your report <span className="font-semibold text-slate-900">{sent.reference}</span> was sent to the OKB admins. They will look into
              it{contact.trim() ? " and contact you if they need more details" : ""}.
            </p>
            <button type="button" onClick={onClose} className="mt-2 h-12 w-full max-w-xs rounded-xl bg-slate-900 text-[15px] font-semibold text-white active:bg-slate-700">
              Done
            </button>
          </div>
        ) : (
          <form
            noValidate
            className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <p className="text-sm text-slate-600">Something wrong or not working? Tell the OKB team and they will fix it.</p>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">What kind of problem?</legend>
              <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                {FEEDBACK_CATEGORIES.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer flex-col justify-center rounded-xl border px-3 py-2 text-left",
                      category === c.id ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200 active:bg-slate-50",
                    )}
                  >
                    <input type="radio" name="feedback-category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="sr-only" />
                    <span className="text-sm font-semibold">{c.label}</span>
                    <span className="text-xs text-slate-500">{c.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor={`${titleId}-message`} className="mb-2 block text-sm font-semibold">
                What happened?
              </label>
              <textarea
                id={`${titleId}-message`}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, FEEDBACK_MESSAGE_MAX))}
                rows={4}
                aria-required="true"
                placeholder="e.g. The flood map stays blank on my phone after I tap Incidents."
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {message.length} / {FEEDBACK_MESSAGE_MAX}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">
                Screenshot <span className="font-normal text-slate-500">(optional)</span>
              </p>
              {shot ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (object URL) */}
                  <img src={shot.url} alt="Screenshot to send" className="max-h-40 rounded-xl border border-slate-200 object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(shot.url);
                      setShot(null);
                    }}
                    aria-label="Remove the screenshot"
                    className="absolute -right-2 -top-2 flex size-10 items-center justify-center rounded-full bg-slate-900 text-white shadow"
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-700 active:bg-slate-50"
                >
                  <ImagePlus className="size-5" aria-hidden />
                  Add a screenshot
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void pickShot(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>

            <div>
              <label htmlFor={`${titleId}-contact`} className="mb-1 block text-sm font-semibold">
                Your e-mail or mobile number <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <p className="mb-2 text-xs text-slate-500">Only if you want the OKB team to reply or ask for details.</p>
              <input
                id={`${titleId}-contact`}
                value={contact}
                onChange={(e) => setContact(e.target.value.slice(0, 120))}
                autoComplete="email"
                inputMode="email"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Honeypot: hidden from people, filled by bots. */}
            <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />

            <p className="break-all text-xs text-slate-500">Sent with the page you are on: {pathname}</p>
            <p className="text-xs text-slate-500">
              How we handle what you send:{" "}
              <a href={PUBLIC_ROUTES.privacyPolicy} target="_blank" rel="noopener" className="font-semibold text-blue-700 underline">
                Privacy Policy
              </a>
            </p>

            {error ? (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-[15px] font-semibold text-white active:bg-blue-700 disabled:opacity-70"
            >
              {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
              {busy ? "Sending…" : "Send report"}
            </button>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}

/** A button (styled by the caller) that opens "Report a problem". */
export function FeedbackButton({ className, children, label = "Report a problem" }: { className?: string; children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  // The dialog is added on the first tap (pages have several of these buttons) and kept for its closing slide.
  const [used, setUsed] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
        aria-label={label}
        className={className}
      >
        {children}
      </button>
      {used ? <FeedbackDialog open={open} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
