"use client";

import { useState, type ReactNode } from "react";
import { Ban, Download, Eye, FileText, MessageSquareText, RotateCcw, Send, Smartphone, Trash2 } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ReportsGate } from "@/features/reports/components/reports-gate";
import { BulkBar, SelectBox, useSelection } from "@/features/consolidated-reports/components/bulk-select";
import { ReportSchedule } from "@/features/consolidated-reports/components/report-schedule";
import { cn } from "@/utils/cn";
import {
  useConsolidatedHistory,
  useConsolidatedSettings,
  useCancelText,
  useDeleteReport,
  useDeleteReports,
  useResend,
  useRetryText,
  useSaveConsolidatedSettings,
  useTestSend,
} from "@/features/consolidated-reports/hooks";
import { formatDate, formatShort, manilaInputToIso, manilaInputValue, periodText } from "@/features/consolidated-reports/format";
import {
  MAX_TEST_PERIOD_DAYS,
  type ConsolidatedReport,
  type ConsolidatedSettings,
  type ConsolidatedSettingsInput,
  type PdfDeliveryStatus,
  type TestPeriod,
  type TextDeliveryStatus,
  type WhatsAppStatus,
} from "@/features/consolidated-reports/types";

// Reporting period of a TEST REPORT: the last N hours, or a custom From–To (Asia/Manila).
const TEST_RANGES = [
  { key: "6", label: "Last 6 h", hours: 6 },
  { key: "12", label: "Last 12 h", hours: 12 },
  { key: "24", label: "Last 24 h", hours: 24 },
  { key: "custom", label: "Custom", hours: null },
] as const;
type TestRange = (typeof TEST_RANGES)[number]["key"];
const HOUR_MS = 60 * 60 * 1000;

// TEXT: sent automatically to the destination group by the bridge phone (no operator action).
const TEXT_STATUS: Record<TextDeliveryStatus, { label: string; variant: BadgeVariant }> = {
  scheduled: { label: "Scheduled", variant: "info" },
  sending: { label: "Sending", variant: "info" },
  sent: { label: "Sent", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

// PDF: sent automatically by the bridge phone (app 1.5.0+); when it cannot, the operator taps "Send as PDF" there.
const PDF_STATUS: Record<PdfDeliveryStatus, { label: string; variant: BadgeVariant }> = {
  ready: { label: "PDF Ready · waiting for bridge phone", variant: "warning" },
  notified: { label: "On bridge phone · sending", variant: "info" },
  opened: { label: "Opened in WhatsApp", variant: "info" },
  sent: { label: "Sent", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

// Older backends report only the PDF state, as whatsappStatus.
const LEGACY_PDF_STATUS: Record<WhatsAppStatus, PdfDeliveryStatus> = {
  pending: "ready",
  notified: "notified",
  opened: "opened",
  sent: "sent",
  failed: "failed",
};

const pdfStatusOf = (r: ConsolidatedReport): PdfDeliveryStatus | null =>
  r.pdfDelivery?.status ?? (r.pdfStatus === "generated" ? (LEGACY_PDF_STATUS[r.whatsappStatus] ?? "ready") : null);

const PDF_INSTRUCTION =
  "PDF: the bridge phone sends it to the destination group automatically. If it cannot, it shows “PDF Ready” and the operator taps “Send as PDF”.";

/** The bridge phone checks in every ~30 s while monitoring (older app versions: every 15 minutes). */
const PHONE_STALE_MS = 20 * 60 * 1000;

function toInput(s: ConsolidatedSettings): ConsolidatedSettingsInput {
  return { enabled: s.enabled, sendOnlyIfReports: s.sendOnlyIfReports };
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "The request failed.");

function Row({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2 border-t border-border/60 pt-4 first:border-t-0 first:pt-0", className)}>
      <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function SettingsPanel() {
  const toast = useToast();
  const settings = useConsolidatedSettings();
  const save = useSaveConsolidatedSettings();
  const test = useTestSend();
  const [draft, setDraft] = useState<ConsolidatedSettingsInput | null>(null);
  const [testRange, setTestRange] = useState<TestRange>("24");
  const [testFrom, setTestFrom] = useState("");
  const [testTo, setTestTo] = useState("");

  if (settings.isPending) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (settings.isError) {
    return (
      <Card>
        <ErrorState
          title="Automated reports are not available"
          description={errorMessage(settings.error)}
          onRetry={() => settings.refetch()}
        />
      </Card>
    );
  }

  const saved = settings.data;
  const form = draft ?? toInput(saved);
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(toInput(saved));
  const set = (patch: Partial<ConsolidatedSettingsInput>) => setDraft({ ...form, ...patch });
  const savedGroupMissing = saved.destinationGroup.trim().length === 0;

  const onSave = () =>
    save.mutate(form, {
      onSuccess: () => {
        setDraft(null);
        toast.success("Settings saved");
      },
      onError: (e) => toast.error({ title: "Settings not saved", description: errorMessage(e) }),
    });

  // Custom test period: both ends required, From before To, To not in the future, at most MAX_TEST_PERIOD_DAYS.
  const fromIso = manilaInputToIso(testFrom);
  const toIso = manilaInputToIso(testTo);
  const customPeriodError =
    testRange !== "custom" || (!testFrom && !testTo)
      ? null
      : !fromIso || !toIso
        ? "Choose both From and To."
        : Date.parse(fromIso) >= Date.parse(toIso)
          ? "From must be before To."
          : Date.parse(toIso) > Date.now() + 60_000
            ? "To cannot be in the future."
            : Date.parse(toIso) - Date.parse(fromIso) > MAX_TEST_PERIOD_DAYS * 24 * HOUR_MS
              ? `The period can be at most ${MAX_TEST_PERIOD_DAYS} days.`
              : null;
  const customPeriodReady = testRange !== "custom" || (fromIso !== null && toIso !== null && customPeriodError === null);
  const chooseRange = (key: TestRange) => {
    setTestRange(key);
    // Start the custom inputs from the last 24 hours, so only the part that changes needs editing.
    if (key === "custom" && !testFrom && !testTo) {
      const now = new Date();
      setTestFrom(manilaInputValue(new Date(now.getTime() - 24 * HOUR_MS)));
      setTestTo(manilaInputValue(now));
    }
  };
  const testPeriod = (): TestPeriod => {
    if (testRange === "custom") return { periodStart: fromIso ?? undefined, periodEnd: toIso ?? undefined };
    const hours = TEST_RANGES.find((r) => r.key === testRange)?.hours ?? 24;
    const end = new Date();
    return { periodStart: new Date(end.getTime() - hours * HOUR_MS).toISOString(), periodEnd: end.toISOString() };
  };
  const customPreview = (() => {
    if (testRange !== "custom" || !fromIso || !toIso || customPeriodError) return null;
    const p = periodText(fromIso, toIso);
    // One day: "October 7, 2026 · 06:00 AM – 09:30 AM"; longer periods already name both dates.
    return formatDate(fromIso) === formatDate(toIso) ? `${p.date} · ${p.time}` : p.time;
  })();

  const onTest = () =>
    test.mutate(testPeriod(), {
      onSuccess: (r) =>
        toast.success({
          title: "TEST REPORT prepared",
          description: `${r.reportCount} report${r.reportCount === 1 ? "" : "s"}. The bridge phone sends the TEST text automatically to ${r.destinationGroup ?? "the destination group"} within seconds. ${PDF_INSTRUCTION}`,
          duration: 10_000,
        }),
      onError: (e) => toast.error({ title: "TEST REPORT not prepared", description: errorMessage(e) }),
    });

  const lastCheck = saved.lastDeviceCheckAt ? new Date(saved.lastDeviceCheckAt).getTime() : null;
  const phoneStale = lastCheck === null || Date.now() - lastCheck > PHONE_STALE_MS;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FileText className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-subheading text-foreground">Automated WhatsApp reports</h2>
            <p className="text-caption text-muted-foreground">
              One consolidated report for each entry of the report schedule below. The TEXT report is sent automatically
              to the WhatsApp destination group by the OKB Bridge phone, also at 12:00 AM with nobody at the phone. The
              PDF is sent there automatically too (app 1.5.0 or later); if the phone cannot, the operator sends it.
            </p>
          </div>
        </div>

        <Row label="Status">
          <Switch
            id="okb-auto-enabled"
            checked={form.enabled}
            onCheckedChange={(enabled) => set({ enabled })}
            label={form.enabled ? "Enabled" : "Disabled"}
            className="min-h-11"
          />
        </Row>

        <Row label="WhatsApp device">
          <p className="flex items-start gap-2 text-body text-foreground">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              OKB Bridge phone
              <span className={cn("block text-caption", phoneStale ? "text-warning" : "text-muted-foreground")}>
                {lastCheck === null
                  ? "Has not checked in yet. Install the latest bridge app and configure the backend."
                  : `Last check ${formatShort(saved.lastDeviceCheckAt)}${phoneStale ? " — the phone may be offline" : ""}`}
              </span>
            </span>
          </p>
        </Row>

        <Row label="Destination group">
          {savedGroupMissing ? (
            <p className="text-body font-semibold text-warning">Not set on the bridge phone</p>
          ) : (
            <p className="flex items-start gap-2 break-words text-body text-foreground">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0">{saved.destinationGroup}</span>
            </p>
          )}
          <p className="text-caption text-muted-foreground">
            Set on the bridge phone only: OKB Bridge app → Settings → WhatsApp Report Groups → Destination Group. The
            TEXT and PDF reports are sent to this group automatically. To change it, change it
            on the phone; it shows here within a minute.
          </p>
        </Row>

        <Row label="Reporting timezone">
          <p className="text-body text-foreground">Asia/Manila (Philippine Time, UTC+8)</p>
        </Row>

        <Row label="Send only if reports exist">
          <Switch
            id="okb-auto-only-if"
            checked={form.sendOnlyIfReports}
            onCheckedChange={(sendOnlyIfReports) => set({ sendOnlyIfReports })}
            label={form.sendOnlyIfReports ? "Yes — nothing is sent for a period with no reports" : "No — still prepare an empty PDF (never a text)"}
            className="min-h-11"
          />
        </Row>

        <Row label="Test reporting period">
          <p className="text-caption text-muted-foreground">
            Which flood reports go into a Test Send (Asia/Manila). Regular reports always cover the time since the
            previous scheduled report.
          </p>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Test reporting period">
            {TEST_RANGES.map((r) => {
              const active = testRange === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseRange(r.key)}
                  className={cn(
                    "h-11 rounded-lg border px-1 text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted/40",
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          {testRange === "custom" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="From" htmlFor="okb-test-from">
                <Input
                  id="okb-test-from"
                  type="datetime-local"
                  value={testFrom}
                  max={testTo || undefined}
                  onChange={(e) => setTestFrom(e.target.value)}
                  invalid={customPeriodError !== null}
                  className="h-11"
                />
              </Field>
              <Field label="To" htmlFor="okb-test-to">
                <Input
                  id="okb-test-to"
                  type="datetime-local"
                  value={testTo}
                  min={testFrom || undefined}
                  max={manilaInputValue(new Date())}
                  onChange={(e) => setTestTo(e.target.value)}
                  invalid={customPeriodError !== null}
                  className="h-11"
                />
              </Field>
            </div>
          ) : null}
          {customPeriodError ? <p className="text-caption text-danger">{customPeriodError}</p> : null}
          {customPreview ? (
            <p className="text-caption text-muted-foreground">
              Reporting period: <PeriodTime text={customPreview} />
            </p>
          ) : null}
        </Row>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={onTest}
            isLoading={test.isPending}
            disabled={dirty || savedGroupMissing || !customPeriodReady}
            leftIcon={<Send className="size-4" aria-hidden />}
            className="justify-center"
          >
            Test Send
          </Button>
          <Button
            size="lg"
            onClick={onSave}
            isLoading={save.isPending}
            disabled={!dirty || (form.enabled && savedGroupMissing)}
            className="justify-center"
          >
            Save Settings
          </Button>
        </div>
        {savedGroupMissing ? (
          <p role="alert" className="rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-caption font-semibold text-warning">
            No destination group is set on the bridge phone. Reports are not prepared and Test Send is unavailable
            until it is set in the OKB Bridge app (Settings → WhatsApp Report Groups → Destination Group).
          </p>
        ) : null}
        <p className="text-caption text-muted-foreground">
          {dirty ? "Save your changes before a test send. " : ""}
          Test Send prepares a TEST REPORT from the reports in the test reporting period; it does not affect the
          regular reports. The bridge
          phone picks it up within seconds, sends the TEXT report on its own and
          marks it Sent only after it sees the message in the destination group. {PDF_INSTRUCTION}
        </p>
      </CardContent>
    </Card>
  );
}

/** "Oct 6, 09:15 AM – Oct 7, 09:15 AM": breaks only between the two ends, never inside one. */
function PeriodTime({ text }: { text: string }) {
  const [start, end] = text.split(" – ");
  if (end === undefined) return <>{text}</>;
  return (
    <>
      <span className="whitespace-nowrap">{start}</span> – <span className="whitespace-nowrap">{end}</span>
    </>
  );
}

function ReportActions({ r, compact = false }: { r: ConsolidatedReport; compact?: boolean }) {
  const toast = useToast();
  const resend = useResend();
  const retry = useRetryText();
  const cancel = useCancelText();
  const remove = useDeleteReport();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const base = `/api/reports/consolidated/${encodeURIComponent(r.id)}/pdf`;
  const hasPdf = r.pdfStatus === "generated";
  // Resend puts the PDF on the phone again; a report sent as TEXT never had a PDF delivery.
  const canResend = hasPdf && r.pdfDelivery !== null;
  const textFailed = r.textDelivery?.status === "failed";
  const textActive = r.textDelivery?.status === "scheduled" || r.textDelivery?.status === "sending";
  const size = compact ? "h-10" : "h-11 flex-1";
  const link = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-caption font-semibold text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    size,
  );
  return (
    <div className={cn("flex flex-wrap gap-2", compact ? "justify-end" : "")}>
      {textActive ? (
        <Button
          variant="outline"
          size="md"
          onClick={() => setConfirmCancel(true)}
          className={cn("justify-center text-caption font-semibold", size)}
          leftIcon={<Ban className="size-4" aria-hidden />}
        >
          Cancel text
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirmCancel}
        title="Cancel the automatic text report?"
        description={`The bridge phone stops trying to send it to ${r.textDelivery?.destinationGroup ?? "the destination group"}. If it was already sent, it stays in the group. The PDF is not affected. You can use Retry text later or prepare a new report.`}
        confirmLabel="Cancel text report"
        cancelLabel="Keep it"
        confirmVariant="danger"
        isLoading={cancel.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() =>
          cancel.mutate(r.id, {
            onSuccess: () => {
              setConfirmCancel(false);
              toast.success({ title: "Text report cancelled", description: "The bridge phone stops at its next check." });
            },
            onError: (e) => {
              setConfirmCancel(false);
              toast.error({ title: "Not cancelled", description: errorMessage(e) });
            },
          })
        }
      />
      {textFailed ? (
        <Button
          variant="outline"
          size="md"
          isLoading={retry.isPending}
          onClick={() =>
            retry.mutate(r.id, {
              onSuccess: () =>
                toast.success({ title: "Text report scheduled again", description: "The bridge phone sends it automatically at its next check." }),
              onError: (e) => toast.error({ title: "Not retried", description: errorMessage(e) }),
            })
          }
          className={cn("justify-center text-caption font-semibold", size)}
          leftIcon={<RotateCcw className="size-4" aria-hidden />}
        >
          Retry text
        </Button>
      ) : null}
      {hasPdf ? (
        <>
          <a href={base} target="_blank" rel="noopener" className={link}>
            <Eye className="size-4" aria-hidden /> View
          </a>
          <a href={`${base}?download=1`} className={link}>
            <Download className="size-4" aria-hidden /> Download
          </a>
          {canResend ? <Button
            variant="outline"
            size="md"
            isLoading={resend.isPending}
            onClick={() =>
              resend.mutate(r.id, {
                onSuccess: () =>
                  toast.success({ title: "PDF queued for the phone again", description: `Picked up at the next check. ${PDF_INSTRUCTION}` }),
                onError: (e) => toast.error({ title: "Not queued", description: errorMessage(e) }),
              })
            }
            className={cn("justify-center text-caption font-semibold", size)}
            leftIcon={<Send className="size-4" aria-hidden />}
            aria-label="Resend PDF"
          >
            Resend
          </Button> : null}
        </>
      ) : null}
      <Button
        variant="outline"
        size="md"
        onClick={() => setConfirmDelete(true)}
        className={cn("justify-center text-caption font-semibold text-danger", size)}
        leftIcon={<Trash2 className="size-4" aria-hidden />}
        aria-label="Delete report"
      >
        Delete
      </Button>
      <ConfirmDialog
        open={confirmDelete}
        title={r.kind === "test" ? "Delete this TEST REPORT?" : "Delete this report?"}
        description={
          `The report, its PDF and its delivery history are removed. ` +
          (textActive
            ? "Its text has not been sent yet: the bridge phone will not send it. "
            : "Messages already sent stay in the WhatsApp group. ") +
          "This cannot be undone."
        }
        confirmLabel="Delete report"
        cancelLabel="Keep it"
        confirmVariant="danger"
        isLoading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(r.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              toast.success("Report deleted");
            },
            onError: (e) => {
              setConfirmDelete(false);
              toast.error({ title: "Not deleted", description: errorMessage(e) });
            },
          })
        }
      />
    </div>
  );
}

/** AUTOMATIC TEXT REPORT status: badge, destination and outcome. No send action: it is sent automatically. */
function TextStatus({ r }: { r: ConsolidatedReport }) {
  const t = r.textDelivery;
  if (!t) {
    return (
      <span className="text-muted-foreground">
        {r.pdfDelivery ? "Not sent as text (PDF only)" : r.reportCount === 0 ? "None (no reports)" : "—"}
      </span>
    );
  }
  const retrying = t.status === "scheduled" && t.errorMessage !== null;
  const status = TEXT_STATUS[t.status];
  return (
    <div className="space-y-1">
      {t.cancelled ? (
        <Badge variant="default" dot>
          Cancelled
        </Badge>
      ) : (
        <Badge variant={retrying ? "warning" : status.variant} dot>
          {retrying ? `Scheduled · retrying (${t.attempts}/${t.maxAttempts})` : status.label}
        </Badge>
      )}
      {t.destinationGroup ? <p className="break-words text-muted-foreground">→ {t.destinationGroup}</p> : null}
      {t.status === "sent" ? <p className="text-foreground">Sent {formatShort(t.sentAt)}</p> : null}
      {t.errorMessage && t.status !== "sent" && !t.cancelled ? <p className="break-words text-danger">{t.errorMessage}</p> : null}
    </div>
  );
}

function PdfStatus({ r }: { r: ConsolidatedReport }) {
  // Sent as TEXT: the PDF exists (View / Download) but was never offered to the phone.
  if (r.pdfDelivery === null && r.textDelivery) {
    return <span className="text-muted-foreground">{r.pdfStatus === "generated" ? "Not sent as PDF (text only)" : "—"}</span>;
  }
  const status = pdfStatusOf(r);
  if (!status) return <Badge variant="danger">PDF not generated</Badge>;
  const sentAt = r.pdfDelivery?.sentAt ?? null;
  return (
    <div className="space-y-1">
      <Badge variant={PDF_STATUS[status].variant} dot>
        {PDF_STATUS[status].label}
      </Badge>
      {status === "sent" && sentAt ? <p className="text-foreground">Sent {formatShort(sentAt)}</p> : null}
      {status === "notified" && r.pdfDelivery?.errorMessage ? <p className="break-words text-warning">{r.pdfDelivery.errorMessage}</p> : null}
    </div>
  );
}

function History() {
  const toast = useToast();
  const history = useConsolidatedHistory();
  const removeMany = useDeleteReports();
  const selection = useSelection((history.data ?? []).map((r) => r.id));
  const [bulkDeleting, setBulkDeleting] = useState(false);
  if (history.isPending) return <Skeleton className="h-32 w-full" />;
  if (history.isError) {
    return (
      <Card>
        <ErrorState title="History unavailable" description={errorMessage(history.error)} onRetry={() => history.refetch()} />
      </Card>
    );
  }
  const items = history.data;
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon={FileText} title="No consolidated reports yet" description="Generated reports and test reports appear here." />
      </Card>
    );
  }

  const count = (r: ConsolidatedReport) => `${r.reportCount} report${r.reportCount === 1 ? "" : "s"}`;
  const picked = items.filter((r) => selection.isSelected(r.id));
  const pickedOpen = picked.filter((r) => r.textDelivery?.status === "scheduled" || r.textDelivery?.status === "sending").length;
  const selectLabel = (r: ConsolidatedReport) => {
    const p = periodText(r.periodStart, r.periodEnd);
    return `Select ${r.kind === "test" ? "TEST REPORT " : "report "}${p.date}, ${p.time}`;
  };
  const deleteSelected = () => {
    const ids = picked.map((r) => r.id);
    if (ids.length === 0) return setBulkDeleting(false);
    removeMany.mutate(ids, {
      onSuccess: ({ deleted, failed }) => {
        setBulkDeleting(false);
        if (failed.length === 0) {
          toast.success(`${deleted.length} report${deleted.length === 1 ? "" : "s"} deleted`);
        } else {
          toast.error({ title: `${failed.length} of ${ids.length} not deleted`, description: failed[0]?.message });
        }
      },
    });
  };

  return (
    <div className="@container space-y-2">
      <BulkBar total={items.length} selection={selection} onDelete={() => setBulkDeleting(true)} />
      <ConfirmDialog
        open={bulkDeleting}
        title={`Delete ${picked.length} report${picked.length === 1 ? "" : "s"}?`}
        description={
          "The reports, their PDFs and their delivery history are removed. " +
          (pickedOpen > 0 ? `${pickedOpen} with a text not sent yet: the bridge phone will not send it. ` : "") +
          "Messages already sent stay in the WhatsApp group. This cannot be undone."
        }
        confirmLabel={`Delete ${picked.length}`}
        cancelLabel="Keep them"
        confirmVariant="danger"
        isLoading={removeMany.isPending}
        onCancel={() => setBulkDeleting(false)}
        onConfirm={deleteSelected}
      />
      <ul className="space-y-2 @3xl:hidden">
        {items.map((r) => {
          const p = periodText(r.periodStart, r.periodEnd);
          const on = selection.isSelected(r.id);
          return (
            <li key={r.id} className={cn("space-y-2.5 rounded-card border bg-card p-3 text-caption", on ? "border-primary bg-primary/5" : "border-border")}>
              <div className="-mr-1.5 -mt-1.5 flex items-center gap-1.5">
                <span className="text-body font-semibold text-foreground">{p.date}</span>
                {r.kind === "test" ? <Badge variant="warning">TEST</Badge> : null}
                <SelectBox id={r.id} label={selectLabel(r)} selection={selection} className="ml-auto" />
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                <dt className="text-muted-foreground">Reporting period</dt>
                <dd className="text-foreground">
                  <PeriodTime text={p.time} />
                </dd>
                <dt className="text-muted-foreground">Reports</dt>
                <dd className="text-foreground">{count(r)}</dd>
                <dt className="text-muted-foreground">Prepared at</dt>
                <dd className="text-foreground">{formatShort(r.generatedAt)}</dd>
                <dt className="flex items-start gap-1 text-muted-foreground">
                  <MessageSquareText className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Automatic text
                </dt>
                <dd className="min-w-0">
                  <TextStatus r={r} />
                </dd>
                <dt className="flex items-start gap-1 text-muted-foreground">
                  <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden /> PDF
                </dt>
                <dd className="min-w-0">
                  <PdfStatus r={r} />
                </dd>
              </dl>
              <ReportActions r={r} />
            </li>
          );
        })}
      </ul>

      <Card className="hidden overflow-hidden @3xl:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-caption">
            <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-12 py-1 pl-2">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Reporting period</th>
                <th className="px-3 py-2.5 font-semibold">Reports</th>
                <th className="px-3 py-2.5 font-semibold">Automatic text</th>
                <th className="px-3 py-2.5 font-semibold">PDF</th>
                <th className="px-3 py-2.5 font-semibold">Prepared at</th>
                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((r) => {
                const p = periodText(r.periodStart, r.periodEnd);
                return (
                  <tr key={r.id} className={cn("align-top", selection.isSelected(r.id) ? "bg-primary/5" : "")}>
                    <td className="py-0.5 pl-2">
                      <SelectBox id={r.id} label={selectLabel(r)} selection={selection} />
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {p.date}
                      {r.kind === "test" ? <Badge variant="warning" className="ml-1.5">TEST</Badge> : null}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">
                      <PeriodTime text={p.time} />
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{count(r)}</td>
                    <td className="max-w-56 px-3 py-2.5">
                      <TextStatus r={r} />
                    </td>
                    <td className="px-3 py-2.5">
                      <PdfStatus r={r} />
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{formatShort(r.generatedAt)}</td>
                    <td className="px-4 py-2.5">
                      <ReportActions r={r} compact />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/**
 * Settings page section: automated consolidated WhatsApp reports + their history. Shown to the same
 * operators who can open the Reports pages (report content and sender data are involved).
 */
export function AutomatedReports() {
  return (
    <ReportsGate area="settings">
      {() => (
        <div className="space-y-6">
          <SettingsPanel />
          <ReportSchedule />
          <section className="space-y-3">
            <h2 className="text-subheading text-foreground">Report history</h2>
            <History />
          </section>
        </div>
      )}
    </ReportsGate>
  );
}
