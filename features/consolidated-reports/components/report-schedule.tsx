"use client";

import { useRef, useState } from "react";
import { ArrowRight, Ban, CalendarClock, FileText, MessageSquareText, Pencil, Plus, RotateCcw, Send, Trash2, TriangleAlert, X } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
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
  useResend,
  useRetryText,
  useSchedules,
  useUpdateSchedule,
} from "@/features/consolidated-reports/hooks";
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
}
const EMPTY: Draft = { from: "", to: "", send: "", as: "TEXT" };

const SEND_AS: { value: ScheduleDeliveryType; label: string; hint: string }[] = [
  { value: "TEXT", label: "Send report as text", hint: "Sent automatically to the group. No PDF goes to the bridge phone." },
  { value: "PDF", label: "Send report as PDF", hint: "The PDF goes to the bridge phone (“PDF Ready”) to send manually. No automatic text." },
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
  if (!d.from && !d.to && !d.send) return { errors, warnings, input: null };
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
    errors.length === 0 && start && end && send ? { periodStart: start, periodEnd: end, sendAt: send, deliveryType: d.as } : null;
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

/** SEND AS: Text (automatic) or PDF (manual, from the bridge phone). */
function SendAs({ type }: { type: ScheduleDeliveryType }) {
  return type === "PDF" ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-foreground">
      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden /> PDF
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
function EntryStatus({ e, enabled, lastCheckAt }: { e: ScheduleEntry; enabled: boolean; lastCheckAt: string | null }) {
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
      return (
        <div className="space-y-1">
          {badge("danger", "Waiting for the bridge phone")}
          {note(
            lastCheckAt
              ? `The bridge phone has not checked in since ${formatShort(lastCheckAt)}. Open the OKB Bridge app, check Background Monitoring is ON and the phone is online.`
              : "The bridge phone has not checked in yet. Open the OKB Bridge app and check Background Monitoring is ON.",
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
  if (e.deliveryType === "PDF" && r) return <PdfEntryStatus r={r} count={count} />;
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
  else if (p.status === "sent") body = <>{badge("success", "SENT")}{note(`Sent ${formatShort(p.sentAt)} (operator confirmed)`, "text-foreground")}</>;
  else if (p.status === "failed") body = <>{badge("danger", "FAILED")}{p.errorMessage ? note(p.errorMessage, "text-danger") : null}</>;
  else if (p.status === "opened") body = <>{badge("info", "Opened in WhatsApp")}{note("Waiting for the operator to confirm it was sent.")}</>;
  else if (p.status === "notified") body = <>{badge("info", "PDF Ready on the phone")}{note("The operator taps “Send as PDF” on the bridge phone.")}</>;
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
              onSuccess: () => toast.success({ title: "PDF ready on the phone again", description: "Shown at the bridge phone's next check." }),
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
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<ScheduleEntry | null>(null);
  const [deleting, setDeleting] = useState<ScheduleEntry | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const entries = schedules.data ?? [];
  const enabled = settings.data?.enabled ?? true;
  const lastCheckAt = settings.data?.lastDeviceCheckAt ?? null;
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

  const deletingOpen = deleting?.report?.textDelivery && ["scheduled", "sending"].includes(deleting.report.textDelivery.status);

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
            <ul className="space-y-2 @xl:hidden" aria-label="Scheduled reports">
              {entries.map((e) => (
                <li key={e.id} className={cn("space-y-2.5 rounded-card border bg-card p-3 text-caption", editing?.id === e.id ? "border-primary" : "border-border")}>
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
                    <dt className="text-muted-foreground">Monitoring period</dt>
                    <dd className="text-foreground">
                      <Period e={e} />
                    </dd>
                    <dt className="text-muted-foreground">Date of sending</dt>
                    <dd className="text-foreground">
                      <Stamp iso={e.sendAt} />
                    </dd>
                    <dt className="text-muted-foreground">Send as</dt>
                    <dd>
                      <SendAs type={e.deliveryType} />
                    </dd>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="min-w-0">
                      <EntryStatus e={e} enabled={enabled} lastCheckAt={lastCheckAt} />
                    </dd>
                  </dl>
                  <EntryActions e={e} onEdit={() => startEdit(e)} onDelete={() => setDeleting(e)} />
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-card border border-border @xl:block">
              <table className="w-full text-left text-caption">
                <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Monitoring period</th>
                    <th className="px-3 py-2.5 font-semibold">Date of sending</th>
                    <th className="px-3 py-2.5 font-semibold">Send as</th>
                    <th className="px-3 py-2.5 font-semibold">Action</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {entries.map((e) => (
                    <tr key={e.id} className={cn("align-top", editing?.id === e.id ? "bg-primary/5" : "")}>
                      <td className="px-4 py-3 text-foreground">
                        <Period e={e} />
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        <Stamp iso={e.sendAt} />
                      </td>
                      <td className="px-3 py-3">
                        <SendAs type={e.deliveryType} />
                      </td>
                      <td className="w-28 px-3 py-3">
                        <EntryActions e={e} onEdit={() => startEdit(e)} onDelete={() => setDeleting(e)} compact />
                      </td>
                      <td className="max-w-80 px-4 py-3">
                        <EntryStatus e={e} enabled={enabled} lastCheckAt={lastCheckAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                    : "It will not be prepared or sent.")
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
