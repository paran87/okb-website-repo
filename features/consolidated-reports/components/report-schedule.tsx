"use client";

import { useRef, useState } from "react";
import { ArrowRight, Ban, CalendarClock, Check, FileText, MessageSquareText, Pencil, Plus, Repeat, RotateCcw, Send, Trash2, TriangleAlert, X } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/utils/cn";
import {
  useCancelText,
  useConsolidatedSettings,
  useCreateSchedule,
  useDeleteSchedule,
  useDeleteSchedules,
  useResend,
  useRetryText,
  useSchedules,
  useUpdateSchedule,
} from "@/features/consolidated-reports/hooks";
import { BulkBar, SelectBox, useSelection } from "@/features/consolidated-reports/components/bulk-select";
import { dateTimeParts, formatShort, manilaInputToIso, manilaInputValue } from "@/features/consolidated-reports/format";
import {
  MAX_SCHEDULE_PERIOD_DAYS,
  type ScheduleDeliveryType,
  type ScheduleEntry,
  type ScheduleInput,
} from "@/features/consolidated-reports/types";

const DAY_MS = 24 * 60 * 60 * 1000;
/** The bridge phone asks the backend every ~30 s; no check-in for this long means it is offline or closed. */
const PHONE_OFFLINE_MS = 3 * 60 * 1000;
/** Same grace as the backend: a date of sending a few minutes ago is still accepted. */
const PAST_GRACE_MS = 5 * 60 * 1000;

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "The request failed.");

interface Draft {
  from: string;
  to: string;
  send: string;
  as: ScheduleDeliveryType;
  /** null: once; otherwise the weekdays it repeats on. */
  repeat: number[] | null;
}
const EMPTY: Draft = { from: "", to: "", send: "", as: "TEXT", repeat: null };

/** Weekdays as the backend numbers them (0 Sunday … 6 Saturday), listed Monday first. */
const WEEK = [
  { day: 1, short: "Mon", label: "Monday" },
  { day: 2, short: "Tue", label: "Tuesday" },
  { day: 3, short: "Wed", label: "Wednesday" },
  { day: 4, short: "Thu", label: "Thursday" },
  { day: 5, short: "Fri", label: "Friday" },
  { day: 6, short: "Sat", label: "Saturday" },
  { day: 0, short: "Sun", label: "Sunday" },
];
const DAILY = [0, 1, 2, 3, 4, 5, 6];
const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));

/** "Once", "Daily", "Weekdays", "Weekends" or "Mon, Wed, Fri". */
function repeatText(days: number[] | null | undefined): string {
  if (!days?.length) return "Once";
  if (days.length === 7) return "Daily";
  if (sameDays(days, [1, 2, 3, 4, 5])) return "Weekdays (Mon–Fri)";
  if (sameDays(days, [0, 6])) return "Weekends";
  return WEEK.filter((w) => days.includes(w.day)).map((w) => w.short).join(", ");
}

const SEND_AS: { value: ScheduleDeliveryType; label: string; hint: string }[] = [
  { value: "TEXT", label: "Send report as text", hint: "Sent automatically to the group. No PDF goes to the bridge phone." },
  { value: "PDF", label: "Send report as PDF + text", hint: "The bridge phone sends the PDF with a caption, then the text report, to the group." },
];

/** Entries a new period may not be confused with: only those not yet prepared can still change. */
const overlaps = (a: { start: number; end: number }, e: ScheduleEntry) =>
  a.start < Date.parse(e.periodEnd) && Date.parse(e.periodStart) < a.end;

/**
 * Checks the operator's dates. Errors block saving (the backend refuses them too); warnings only inform.
 */
function checkDraft(d: Draft, entries: ScheduleEntry[], editingId: string | null) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const start = manilaInputToIso(d.from);
  const end = manilaInputToIso(d.to);
  const send = manilaInputToIso(d.send);
  if (!d.from && !d.to && !d.send && !d.repeat) return { errors, warnings, input: null };
  if (!start || !end) errors.push("Enter both the start and the end of the monitoring period.");
  if (!send) errors.push("Enter the date of sending.");
  if (start && end && Date.parse(start) >= Date.parse(end)) {
    errors.push("The monitoring period must start before it ends.");
  }
  if (start && end && Date.parse(end) - Date.parse(start) > MAX_SCHEDULE_PERIOD_DAYS * DAY_MS) {
    errors.push(`The monitoring period can be at most ${MAX_SCHEDULE_PERIOD_DAYS} days.`);
  }
  if (end && send && Date.parse(send) < Date.parse(end)) {
    errors.push("The date of sending must be at or after the end of the monitoring period; reports received after it would be missing.");
  }
  if (send && Date.parse(send) < Date.now() - PAST_GRACE_MS) errors.push("The date of sending is in the past.");
  const others = entries.filter((e) => e.id !== editingId);
  if (start && end && send && others.some((e) => e.periodStart === start && e.periodEnd === end && e.sendAt === send && e.deliveryType === d.as)) {
    errors.push("This exact entry is already in the schedule.");
  }
  if (start && end && Date.parse(start) < Date.parse(end)) {
    const clash = others.filter((e) => overlaps({ start: Date.parse(start), end: Date.parse(end) }, e));
    for (const e of clash.slice(0, 3)) {
      warnings.push(`Overlaps with ${periodLabel(e.periodStart, e.periodEnd)}: reports received in the overlap are included in both reports.`);
    }
  }
  if (end && send && Date.parse(send) - Date.parse(end) > DAY_MS) {
    warnings.push("The date of sending is more than a day after the monitoring period ends.");
  }
  const input: ScheduleInput | null =
    errors.length === 0 && start && end && send
      ? { periodStart: start, periodEnd: end, sendAt: send, deliveryType: d.as, repeatDays: d.repeat }
      : null;
  return { errors, warnings, input };
}

function periodLabel(startIso: string, endIso: string) {
  const s = dateTimeParts(startIso);
  const e = dateTimeParts(endIso);
  return `${s.date} ${s.time} → ${e.date} ${e.time}`;
}

/** "10/7/2026" over "6:00 PM", as in the schedule sheet. */
function Stamp({ iso }: { iso: string }) {
  const p = dateTimeParts(iso);
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="whitespace-nowrap">{p.date}</span>
      <span className="whitespace-nowrap text-muted-foreground">{p.time}</span>
    </span>
  );
}

/** "every day", "every weekday (Mon–Fri)", "every Mon, Wed and Fri". */
function repeatPhrase(days: number[]): string {
  if (days.length === 7) return "every day";
  if (sameDays(days, [1, 2, 3, 4, 5])) return "every weekday (Mon–Fri)";
  const names = WEEK.filter((w) => days.includes(w.day)).map((w) => w.short);
  return `every ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0]}`;
}

/** "↻ Daily" under the date of sending of a repeating entry. */
function RepeatTag({ days }: { days: number[] | null | undefined }) {
  if (!days?.length) return null;
  return (
    <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-info/12 px-2 py-0.5 text-[11px] font-semibold text-info">
      <Repeat className="size-3 shrink-0" aria-hidden />
      {repeatText(days)}
    </span>
  );
}

/** Weekday picker for "Customize" (like a phone alarm): tap the days, then OK. */
function RepeatDaysDialog({
  open,
  initial,
  onCancel,
  onSave,
}: {
  open: boolean;
  initial: number[] | null;
  onCancel: () => void;
  onSave: (days: number[] | null) => void;
}) {
  const [days, setDays] = useState<number[]>(initial ?? []);
  const [shownFor, setShownFor] = useState(open);
  // Start from the current choice each time it opens.
  if (open !== shownFor) {
    setShownFor(open);
    if (open) setDays(initial ?? []);
  }
  const toggle = (day: number) => setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Customize"
      description="Repeat on these days, with the same monitoring period and time of sending."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(days.length ? [...days].sort((a, b) => a - b) : null)}>OK</Button>
        </>
      }
    >
      <ul className="-mx-1 divide-y divide-border/60" aria-label="Repeat on">
        {WEEK.map((w) => {
          const on = days.includes(w.day);
          return (
            <li key={w.day}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(w.day)}
                className="flex min-h-12 w-full items-center justify-between rounded-lg px-1 text-left text-body text-foreground hover:bg-muted/40"
              >
                {w.label}
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                  aria-hidden
                >
                  {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

/** SEND AS: Text, or PDF (+ the text report after it), sent automatically by the bridge phone. */
function SendAs({ type }: { type: ScheduleDeliveryType }) {
  return type === "PDF" ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-foreground">
      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden /> PDF + text
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-foreground">
      <MessageSquareText className="size-4 shrink-0 text-muted-foreground" aria-hidden /> Text
    </span>
  );
}

function Period({ e }: { e: ScheduleEntry }) {
  return (
    <span className="inline-flex items-start gap-2">
      <Stamp iso={e.periodStart} />
      <ArrowRight className="mt-1 size-4 shrink-0 text-info" aria-label="to" />
      <Stamp iso={e.periodEnd} />
    </span>
  );
}

/**
 * STATUS: SENT (with the time sent), FAILED (with Retry), retrying (with Cancel), or why nothing was sent.
 */
function EntryStatus({
  e,
  enabled,
  lastCheckAt,
  lastPollAt,
}: {
  e: ScheduleEntry;
  enabled: boolean;
  lastCheckAt: string | null;
  lastPollAt: string | null | undefined;
}) {
  const toast = useToast();
  const retry = useRetryText();
  const cancel = useCancelText();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const badge = (variant: BadgeVariant, label: string) => (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
  const note = (text: string, tone = "text-muted-foreground") => <p className={cn("break-words", tone)}>{text}</p>;

  if (e.status === "pending") {
    const due = Date.parse(e.sendAt) <= Date.now();
    if (!enabled) return <div className="space-y-1">{badge("default", "Paused")}{note("Automated reports are disabled.")}</div>;
    const offline = !lastCheckAt || Date.now() - Date.parse(lastCheckAt) > PHONE_OFFLINE_MS;
    if (due && offline) {
      // null (not undefined): the backend knows the quick check but the phone has not used it.
      const noQuickCheck = lastPollAt === null;
      return (
        <div className="space-y-1">
          {badge("danger", "Waiting for the bridge phone")}
          {note(
            noQuickCheck
              ? `The bridge phone is not running the 30-second check${lastCheckAt ? ` (last check ${formatShort(lastCheckAt)})` : ""}, so it only checks every 15 minutes. Install the latest OKB Bridge app (1.4.1 or newer), open it once and keep Background Monitoring ON.`
              : `The bridge phone has not checked in since ${lastCheckAt ? formatShort(lastCheckAt) : "—"}. It is asleep, offline or closed: keep it charging and online, set OKB Bridge's battery usage to No restrictions, and open the app.`,
            "text-danger",
          )}
        </div>
      );
    }
    return due ? (
      <div className="space-y-1">{badge("warning", "Preparing")}{note("The bridge phone picks it up within seconds.")}</div>
    ) : (
      <div className="space-y-1">{badge("info", "Scheduled")}{note(`Sends ${formatShort(e.sendAt)}`)}</div>
    );
  }
  if (e.status === "no_reports") {
    return <div className="space-y-1">{badge("default", "No reports")}{note("Nothing was received in the period, so nothing was sent.")}</div>;
  }
  if (e.status === "missed") {
    return (
      <div className="space-y-1">
        {badge("danger", "Missed")}
        {note("Not prepared within 24 hours of the date of sending (was the bridge phone offline?). Add a new entry to send it.", "text-danger")}
      </div>
    );
  }

  if (!e.reportId) {
    return <div className="space-y-1">{badge("default", "Report deleted")}{note("Its report was deleted from the report history.")}</div>;
  }
  const r = e.report;
  const t = r?.textDelivery ?? null;
  const count = r ? `${r.reportCount} report${r.reportCount === 1 ? "" : "s"}` : null;
  // Older PDF entries have no text report.
  if (e.deliveryType === "PDF" && r && !t) return <PdfEntryStatus r={r} count={count} />;
  if (!r || !t) {
    return <div className="space-y-1">{badge("default", "PDF only")}{note(count ? `${count}; no text for an empty period.` : "Report not found.")}</div>;
  }
  const retrying = t.status === "scheduled" && t.errorMessage !== null;
  const actionClass = "h-10 justify-center text-caption font-semibold";

  let body;
  if (t.status === "sent") {
    body = (
      <>
        {badge("success", "SENT")}
        {note(`Sent ${formatShort(t.sentAt)}`, "text-foreground")}
      </>
    );
  } else if (t.status === "failed") {
    body = (
      <>
        {t.cancelled ? badge("default", "Cancelled") : badge("danger", "FAILED")}
        {!t.cancelled && t.errorMessage ? note(t.errorMessage, "text-danger") : null}
        <Button
          variant="outline"
          size="md"
          isLoading={retry.isPending}
          onClick={() =>
            retry.mutate(r.id, {
              onSuccess: () => toast.success({ title: "Sending again", description: "The bridge phone sends it automatically at its next check." }),
              onError: (err) => toast.error({ title: "Not retried", description: errorMessage(err) }),
            })
          }
          className={actionClass}
          leftIcon={<RotateCcw className="size-4" aria-hidden />}
        >
          Retry
        </Button>
      </>
    );
  } else {
    body = (
      <>
        {retrying ? badge("warning", `Retrying (${t.attempts}/${t.maxAttempts})`) : badge("info", t.status === "sending" ? "Sending" : "Sending soon")}
        {retrying && t.errorMessage ? note(t.errorMessage, "text-danger") : null}
        {!retrying ? note("The bridge phone sends it automatically.") : null}
        <Button
          variant="outline"
          size="md"
          onClick={() => setConfirmCancel(true)}
          className={actionClass}
          leftIcon={<Ban className="size-4" aria-hidden />}
        >
          Cancel
        </Button>
        <ConfirmDialog
          open={confirmCancel}
          title="Cancel this report?"
          description={`The bridge phone stops trying to send it to ${t.destinationGroup ?? "the destination group"}. If it was already sent, it stays in the group. You can Retry it later.`}
          confirmLabel="Cancel report"
          cancelLabel="Keep it"
          confirmVariant="danger"
          isLoading={cancel.isPending}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() =>
            cancel.mutate(r.id, {
              onSuccess: () => {
                setConfirmCancel(false);
                toast.success({ title: "Report cancelled", description: "The bridge phone stops at its next check." });
              },
              onError: (err) => {
                setConfirmCancel(false);
                toast.error({ title: "Not cancelled", description: errorMessage(err) });
              },
            })
          }
        />
      </>
    );
  }
  if (e.deliveryType === "PDF") {
    // The PDF (with its caption) first, then the text report.
    const label = (text: string) => <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{text}</p>;
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="flex flex-col items-start gap-1">
          {label("PDF")}
          <PdfEntryStatus r={r} count={count} />
        </div>
        <div className="flex flex-col items-start gap-1">
          {label("Text report")}
          {body}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {body}
      <p className="text-muted-foreground">
        {count}
        {t.destinationGroup ? ` → ${t.destinationGroup}` : ""}
      </p>
    </div>
  );
}

/** STATUS of an entry sent as PDF: the operator sends it from the bridge phone; Resend puts it there again. */
function PdfEntryStatus({ r, count }: { r: NonNullable<ScheduleEntry["report"]>; count: string | null }) {
  const toast = useToast();
  const resend = useResend();
  const p = r.pdfDelivery ?? null;
  const badge = (variant: BadgeVariant, label: string) => (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
  const note = (text: string, tone = "text-muted-foreground") => <p className={cn("break-words", tone)}>{text}</p>;
  let body;
  if (!p) body = <>{badge("danger", "PDF not generated")}</>;
  else if (p.status === "sent") body = <>{badge("success", "SENT")}{note(`Sent ${formatShort(p.sentAt)}`, "text-foreground")}</>;
  else if (p.status === "failed") body = <>{badge("danger", "FAILED")}{p.errorMessage ? note(p.errorMessage, "text-danger") : null}</>;
  else if (p.status === "opened") body = <>{badge("info", "Opened in WhatsApp")}{note("Waiting for the operator to confirm it was sent.")}</>;
  else if (p.status === "notified" && p.errorMessage)
    body = <>{badge("warning", "Needs the operator")}{note(p.errorMessage, "text-warning")}{note("Tap “Send as PDF” on the bridge phone to send it now.")}</>;
  else if (p.status === "notified") body = <>{badge("info", "Sending from the phone")}{note("The bridge phone sends the PDF to the group automatically.")}</>;
  else body = <>{badge("warning", "PDF ready")}{note("Goes to the bridge phone at its next check.")}</>;
  return (
    <div className="flex flex-col items-start gap-1">
      {body}
      {p && p.status !== "sent" && p.status !== "ready" ? (
        <Button
          variant="outline"
          size="md"
          isLoading={resend.isPending}
          onClick={() =>
            resend.mutate(r.id, {
              onSuccess: () => toast.success({ title: "PDF queued for the phone again", description: "The bridge phone sends it at its next check." }),
              onError: (err) => toast.error({ title: "Not queued", description: errorMessage(err) }),
            })
          }
          className="h-10 justify-center text-caption font-semibold"
          leftIcon={<Send className="size-4" aria-hidden />}
        >
          Resend PDF
        </Button>
      ) : null}
      <p className="text-muted-foreground">
        {count}
        {p?.destinationGroup ? ` → ${p.destinationGroup}` : ""}
      </p>
    </div>
  );
}

function EntryActions({ e, onEdit, onDelete, compact = false }: { e: ScheduleEntry; onEdit: () => void; onDelete: () => void; compact?: boolean }) {
  const size = compact ? "h-10" : "h-11 flex-1";
  return (
    <div className={cn("flex gap-2", compact ? "flex-col" : "")}>
      {e.status === "pending" ? (
        <Button variant="outline" size="md" onClick={onEdit} className={cn("justify-center text-caption font-semibold", size)} leftIcon={<Pencil className="size-4" aria-hidden />}>
          Edit
        </Button>
      ) : null}
      <Button variant="outline" size="md" onClick={onDelete} className={cn("justify-center text-caption font-semibold text-danger", size)} leftIcon={<Trash2 className="size-4" aria-hidden />}>
        Delete
      </Button>
    </div>
  );
}

/**
 * REPORT SCHEDULE: as many entries as needed, each a monitoring period and a date of sending. At the date of
 * sending the reports received in the period (only those) become one consolidated report, and the bridge phone
 * sends its text to the destination group automatically.
 */
export function ReportSchedule() {
  const toast = useToast();
  const schedules = useSchedules();
  const settings = useConsolidatedSettings(15_000);
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const remove = useDeleteSchedule();
  const removeMany = useDeleteSchedules();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [customizing, setCustomizing] = useState(false);
  const [editing, setEditing] = useState<ScheduleEntry | null>(null);
  const [deleting, setDeleting] = useState<ScheduleEntry | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Newest added first (then the later date of sending): a new entry appears at the top.
  const entries = [...(schedules.data ?? [])].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.sendAt.localeCompare(a.sendAt),
  );
  const selection = useSelection(entries.map((e) => e.id));
  const enabled = settings.data?.enabled ?? true;
  const lastCheckAt = settings.data?.lastDeviceCheckAt ?? null;
  const lastPollAt = settings.data?.lastDevicePollAt;
  const check = checkDraft(draft, entries, editing?.id ?? null);
  const saving = create.isPending || update.isPending;

  const setField = (key: keyof Draft, value: string) =>
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // Sending at the end of the period is the usual choice: filled in once, still editable.
      if (key === "to" && (!d.send || d.send === d.to)) next.send = value;
      return next;
    });
  const reset = () => {
    setDraft(EMPTY);
    setEditing(null);
  };
  const startEdit = (e: ScheduleEntry) => {
    setEditing(e);
    setDraft({
      from: manilaInputValue(new Date(e.periodStart)),
      to: manilaInputValue(new Date(e.periodEnd)),
      send: manilaInputValue(new Date(e.sendAt)),
      as: e.deliveryType,
      repeat: e.repeatDays?.length ? e.repeatDays : null,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const submit = () => {
    if (!check.input) return;
    const done = {
      onSuccess: () => {
        toast.success(editing ? "Schedule entry updated" : "Added to the report schedule");
        reset();
      },
      onError: (err: unknown) => toast.error({ title: editing ? "Not updated" : "Not added", description: errorMessage(err) }),
    };
    if (editing) update.mutate({ id: editing.id, input: check.input }, done);
    else create.mutate(check.input, done);
  };

  const isOpen = (e: ScheduleEntry) => !!e.report?.textDelivery && ["scheduled", "sending"].includes(e.report.textDelivery.status);
  const deletingOpen = deleting ? isOpen(deleting) : false;
  const picked = entries.filter((e) => selection.isSelected(e.id));
  const pickedPending = picked.filter((e) => e.status === "pending").length;
  const pickedOpen = picked.filter(isOpen).length;
  const pickedWithReport = picked.filter((e) => e.reportId).length;
  const deleteSelected = () => {
    const ids = picked.map((e) => e.id);
    if (ids.length === 0) return setBulkDeleting(false);
    removeMany.mutate(ids, {
      onSuccess: ({ deleted, failed }) => {
        if (editing && deleted.includes(editing.id)) reset();
        setBulkDeleting(false);
        if (failed.length === 0) {
          toast.success(`${deleted.length} removed from the schedule`);
        } else {
          toast.error({
            title: `${failed.length} of ${ids.length} not deleted`,
            description: failed[0]?.message,
          });
        }
      },
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <CalendarClock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-subheading text-foreground">Report schedule</h2>
            <p className="text-caption text-muted-foreground">
              Add as many reports as you need. At each date of sending, only the flood reports received in its
              monitoring period (AI-analyzed and summarized) go into one consolidated report. Sent as text, the bridge
              phone sends it to the destination group automatically; sent as PDF, it waits on the phone as “PDF Ready”
              for the operator. Times are Asia/Manila.
            </p>
          </div>
        </div>

        {!enabled ? (
          <p role="status" className="rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-caption font-semibold text-warning">
            Automated reports are disabled: scheduled reports are not prepared until you enable them in the settings above.
          </p>
        ) : null}

        <div ref={formRef} className="space-y-3 rounded-card border border-border/70 p-3 sm:p-4">
          <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
            {editing ? "Edit scheduled report" : "Add a scheduled report"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Monitoring period: from" htmlFor="okb-sched-from">
              <Input id="okb-sched-from" type="datetime-local" value={draft.from} onChange={(e) => setField("from", e.target.value)} className="h-11" />
            </Field>
            <Field label="Monitoring period: to" htmlFor="okb-sched-to">
              <Input id="okb-sched-to" type="datetime-local" value={draft.to} min={draft.from || undefined} onChange={(e) => setField("to", e.target.value)} className="h-11" />
            </Field>
            <Field label="Date of sending" htmlFor="okb-sched-send" className="sm:col-span-2 xl:col-span-1">
              <Input id="okb-sched-send" type="datetime-local" value={draft.send} min={draft.to || undefined} onChange={(e) => setField("send", e.target.value)} className="h-11" />
            </Field>
          </div>
          <div className="space-y-1.5">
            <p className="text-caption font-medium text-foreground">Send report as</p>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Send report as">
              {SEND_AS.map((o) => {
                const active = draft.as === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDraft((d) => ({ ...d, as: o.value }))}
                    className={cn(
                      "min-h-11 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/40",
                    )}
                  >
                    <span className="flex items-center gap-2 text-caption font-semibold text-foreground">
                      {o.value === "PDF" ? <FileText className="size-4 shrink-0" aria-hidden /> : <MessageSquareText className="size-4 shrink-0" aria-hidden />}
                      {o.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{o.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-caption font-medium text-foreground">Repeat</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Repeat">
              {(
                [
                  ["once", "Once", !draft.repeat],
                  ["daily", "Daily", draft.repeat?.length === 7],
                  ["custom", "Customize", !!draft.repeat && draft.repeat.length < 7],
                ] as const
              ).map(([key, label, active]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    if (key === "once") setDraft((d) => ({ ...d, repeat: null }));
                    else if (key === "daily") setDraft((d) => ({ ...d, repeat: DAILY }));
                    else setCustomizing(true);
                  }}
                  className={cn(
                    "min-h-11 rounded-lg border px-2 py-1.5 text-center text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted/40",
                  )}
                >
                  {label}
                  {key === "custom" && active ? (
                    <span className="block truncate text-[11px] font-medium text-muted-foreground">{repeatText(draft.repeat)}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {draft.repeat
                ? `After each sending the next one is added ${repeatPhrase(draft.repeat)}, with the same monitoring period and time of sending.`
                : "Sent once, at the date of sending."}
            </p>
            <RepeatDaysDialog
              open={customizing}
              initial={draft.repeat}
              onCancel={() => setCustomizing(false)}
              onSave={(days) => {
                setDraft((d) => ({ ...d, repeat: days }));
                setCustomizing(false);
              }}
            />
          </div>
          {check.errors.length > 0 ? (
            <div role="alert" className="space-y-1 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-caption text-danger">
              {check.errors.map((m) => (
                <p key={m} className="flex items-start gap-1.5">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {m}
                </p>
              ))}
            </div>
          ) : null}
          {check.warnings.length > 0 ? (
            <div role="status" className="space-y-1 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-caption text-warning">
              {check.warnings.map((m) => (
                <p key={m} className="flex items-start gap-1.5">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {m}
                </p>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {editing || draft !== EMPTY ? (
              <Button variant="outline" size="lg" onClick={reset} className="justify-center" leftIcon={<X className="size-4" aria-hidden />}>
                {editing ? "Cancel edit" : "Clear"}
              </Button>
            ) : null}
            <Button
              size="lg"
              onClick={submit}
              isLoading={saving}
              disabled={!check.input}
              className="justify-center"
              leftIcon={editing ? <Pencil className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            >
              {editing ? "Save changes" : "Add to schedule"}
            </Button>
          </div>
        </div>

        {schedules.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : schedules.isError ? (
          <ErrorState title="Report schedule unavailable" description={errorMessage(schedules.error)} onRetry={() => schedules.refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No scheduled reports" description="Add a monitoring period and a date of sending above." />
        ) : (
          <div className="@container">
            <BulkBar total={entries.length} selection={selection} onDelete={() => setBulkDeleting(true)} />
            <ul className="mt-2 space-y-2 @xl:hidden" aria-label="Scheduled reports">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className={cn(
                    "relative space-y-2.5 rounded-card border bg-card p-3 text-caption",
                    editing?.id === e.id || selection.isSelected(e.id) ? "border-primary" : "border-border",
                    selection.isSelected(e.id) ? "bg-primary/5" : "",
                  )}
                >
                  <SelectBox id={e.id} label={`Select ${periodLabel(e.periodStart, e.periodEnd)}`} selection={selection} className="absolute right-1 top-1" />
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 pr-9">
                    <dt className="text-muted-foreground">Monitoring period</dt>
                    <dd className="text-foreground">
                      <Period e={e} />
                    </dd>
                    <dt className="text-muted-foreground">Date of sending</dt>
                    <dd className="text-foreground">
                      <Stamp iso={e.sendAt} />
                      <RepeatTag days={e.repeatDays} />
                    </dd>
                    <dt className="text-muted-foreground">Send as</dt>
                    <dd>
                      <SendAs type={e.deliveryType} />
                    </dd>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="min-w-0">
                      <EntryStatus e={e} enabled={enabled} lastCheckAt={lastCheckAt} lastPollAt={lastPollAt} />
                    </dd>
                  </dl>
                  <EntryActions e={e} onEdit={() => startEdit(e)} onDelete={() => setDeleting(e)} />
                </li>
              ))}
            </ul>

            <div className="mt-2 hidden overflow-hidden rounded-card border border-border @xl:block">
              <table className="w-full text-left text-caption">
                <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-12 py-1 pl-2">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-4 py-2.5 font-semibold">Monitoring period</th>
                    <th className="px-3 py-2.5 font-semibold">Date of sending</th>
                    <th className="px-3 py-2.5 font-semibold">Send as</th>
                    <th className="px-3 py-2.5 font-semibold">Action</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {entries.map((e) => (
                    <tr key={e.id} className={cn("align-top", editing?.id === e.id || selection.isSelected(e.id) ? "bg-primary/5" : "")}>
                      <td className="py-1.5 pl-2">
                        <SelectBox id={e.id} label={`Select ${periodLabel(e.periodStart, e.periodEnd)}`} selection={selection} />
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <Period e={e} />
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        <Stamp iso={e.sendAt} />
                        <RepeatTag days={e.repeatDays} />
                      </td>
                      <td className="px-3 py-3">
                        <SendAs type={e.deliveryType} />
                      </td>
                      <td className="w-28 px-3 py-3">
                        <EntryActions e={e} onEdit={() => startEdit(e)} onDelete={() => setDeleting(e)} compact />
                      </td>
                      <td className="max-w-80 px-4 py-3">
                        <EntryStatus e={e} enabled={enabled} lastCheckAt={lastCheckAt} lastPollAt={lastPollAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={bulkDeleting}
          title={`Delete ${picked.length} scheduled report${picked.length === 1 ? "" : "s"}?`}
          description={[
            pickedPending > 0 ? `${pickedPending} not prepared yet will not be prepared or sent.` : "",
            pickedOpen > 0 ? `${pickedOpen} not sent yet will be cancelled.` : "",
            pickedWithReport > 0 ? "Prepared reports stay in the report history." : "",
          ]
            .filter(Boolean)
            .join(" ")}
          confirmLabel={`Delete ${picked.length}`}
          cancelLabel="Keep them"
          confirmVariant="danger"
          isLoading={removeMany.isPending}
          onCancel={() => setBulkDeleting(false)}
          onConfirm={deleteSelected}
        />

        <ConfirmDialog
          open={deleting !== null}
          title="Delete this scheduled report?"
          description={
            deleting
              ? `${periodLabel(deleting.periodStart, deleting.periodEnd)}, sending ${formatShort(deleting.sendAt)}. ` +
                (deletingOpen
                  ? "Its report has not been sent yet: deleting cancels it. It stays in the report history."
                  : deleting.reportId
                    ? "Its report stays in the report history."
                    : "It will not be prepared or sent.") +
                (deleting.status === "pending" && deleting.repeatDays?.length ? " This also stops it repeating." : "")
              : ""
          }
          confirmLabel="Delete"
          cancelLabel="Keep it"
          confirmVariant="danger"
          isLoading={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            deleting &&
            remove.mutate(deleting.id, {
              onSuccess: () => {
                if (editing?.id === deleting.id) reset();
                setDeleting(null);
                toast.success("Removed from the schedule");
              },
              onError: (err) => {
                setDeleting(null);
                toast.error({ title: "Not deleted", description: errorMessage(err) });
              },
            })
          }
        />
      </CardContent>
    </Card>
  );
}
