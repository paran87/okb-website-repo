"use client";

import { useState, type ReactNode } from "react";
import { Download, Eye, FileText, Send, Smartphone } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ReportsGate } from "@/features/reports/components/reports-gate";
import { cn } from "@/utils/cn";
import {
  useConsolidatedHistory,
  useConsolidatedSettings,
  useResend,
  useSaveConsolidatedSettings,
  useTestSend,
} from "@/features/consolidated-reports/hooks";
import { formatShort, periodText, SCHEDULE_LABELS } from "@/features/consolidated-reports/format";
import {
  REPORT_INTERVALS,
  SCHEDULE_TIMES,
  type ConsolidatedReport,
  type ConsolidatedSettings,
  type ConsolidatedSettingsInput,
  type ReportInterval,
  type WhatsAppStatus,
} from "@/features/consolidated-reports/types";

// Delivery is completed by the operator in WhatsApp; the bridge can only tell that the share screen was opened.
const DELIVERY_STATUS: Record<WhatsAppStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Ready to send · waiting for bridge phone", variant: "warning" },
  notified: { label: "Ready to send · on bridge phone", variant: "info" },
  opened: { label: "Opened in WhatsApp", variant: "info" },
  sent: { label: "Sent · confirmed by operator", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

const SHARE_INSTRUCTION = "WhatsApp share screen will open. Select the configured destination group and press Send.";

const PHONE_STALE_MS = 45 * 60 * 1000;

function toInput(s: ConsolidatedSettings): ConsolidatedSettingsInput {
  return {
    enabled: s.enabled,
    scheduleTimes: s.scheduleTimes,
    intervalMinutes: s.intervalMinutes,
    sendOnlyIfReports: s.sendOnlyIfReports,
    destinationGroup: s.destinationGroup,
  };
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
  const noSchedule = form.enabled && form.scheduleTimes.length === 0 && form.intervalMinutes === null;
  // The destination group can be set here (override) or on the bridge phone (Settings → WhatsApp Report Groups).
  const phone = (saved.bridgeDevices ?? [])
    .slice()
    .sort((a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? ""))[0];
  const phoneDestination = phone?.destinationGroupName?.trim() ?? "";
  const groupMissing = form.destinationGroup.trim().length === 0 && !phoneDestination;
  const savedGroupMissing = saved.destinationGroup.trim().length === 0 && !phoneDestination;

  const toggleTime = (t: (typeof SCHEDULE_TIMES)[number], on: boolean) =>
    set({ scheduleTimes: SCHEDULE_TIMES.filter((x) => (x === t ? on : form.scheduleTimes.includes(x))) });

  const onSave = () =>
    save.mutate(form, {
      onSuccess: () => {
        setDraft(null);
        toast.success("Settings saved");
      },
      onError: (e) => toast.error({ title: "Settings not saved", description: errorMessage(e) }),
    });

  const onTest = () =>
    test.mutate(undefined, {
      onSuccess: (r) =>
        toast.success({
          title: "TEST REPORT prepared",
          description: `${r.reportCount} report${r.reportCount === 1 ? "" : "s"}. The bridge phone shows a notification at its next check (within 15 minutes). ${SHARE_INSTRUCTION}`,
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
              One consolidated PDF of the field reports received in each reporting period, sent to the WhatsApp group
              from the OKB Bridge phone.
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
              {phone ? (
                <span className="block text-caption text-muted-foreground">
                  Source group: {phone.sourceGroupName ?? "not set"} · Destination group: {phone.destinationGroupName ?? "not set"}
                </span>
              ) : null}
            </span>
          </p>
        </Row>

        <Row label="Destination group">
          <Field
            htmlFor="okb-auto-group"
            error={
              groupMissing
                ? "No destination group is configured here or on the bridge phone. Enter the WhatsApp group name."
                : undefined
            }
            description={
              (phoneDestination && !form.destinationGroup.trim()
                ? `Using the bridge phone's destination group “${phoneDestination}”. Enter a name here only to override it. `
                : "") +
              "When a report is ready, WhatsApp will open the share screen. Select this group and press Send. The group is not selected automatically."
            }
          >
            <Input
              id="okb-auto-group"
              value={form.destinationGroup}
              onChange={(e) => set({ destinationGroup: e.target.value })}
              maxLength={100}
              placeholder={phoneDestination || "e.g. OKB COMMAND CENTER"}
              invalid={groupMissing}
              className="h-11"
            />
          </Field>
        </Row>

        <Row label="Schedule">
          <div className="grid gap-1 sm:grid-cols-3">
            {SCHEDULE_TIMES.map((t) => (
              <Checkbox
                key={t}
                id={`okb-auto-time-${t}`}
                checked={form.scheduleTimes.includes(t)}
                onChange={(e) => toggleTime(t, e.target.checked)}
                label={SCHEDULE_LABELS[t]}
                className="min-h-11 rounded-lg px-2 hover:bg-muted/40"
              />
            ))}
          </div>
        </Row>

        <Row label="Report interval">
          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Report interval">
            {([null, ...REPORT_INTERVALS] as (ReportInterval | null)[]).map((m) => {
              const active = form.intervalMinutes === m;
              return (
                <button
                  key={m ?? "off"}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set({ intervalMinutes: m })}
                  className={cn(
                    "h-11 rounded-lg border text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted/40",
                  )}
                >
                  {m === null ? "Off" : `${m} min`}
                </button>
              );
            })}
          </div>
          {noSchedule ? <p className="text-caption text-danger">Choose at least one schedule time or an interval.</p> : null}
        </Row>

        <Row label="Reporting timezone">
          <p className="text-body text-foreground">Asia/Manila (Philippine Time, UTC+8)</p>
        </Row>

        <Row label="Send only if reports exist">
          <Switch
            id="okb-auto-only-if"
            checked={form.sendOnlyIfReports}
            onCheckedChange={(sendOnlyIfReports) => set({ sendOnlyIfReports })}
            label={form.sendOnlyIfReports ? "Yes — skip periods with no new reports" : "No — also send an empty report"}
            className="min-h-11"
          />
        </Row>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={onTest}
            isLoading={test.isPending}
            disabled={dirty || savedGroupMissing}
            leftIcon={<Send className="size-4" aria-hidden />}
            className="justify-center"
          >
            Test Send
          </Button>
          <Button
            size="lg"
            onClick={onSave}
            isLoading={save.isPending}
            disabled={!dirty || noSchedule || (form.enabled && groupMissing)}
            className="justify-center"
          >
            Save Settings
          </Button>
        </div>
        {savedGroupMissing ? (
          <p role="alert" className="rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-caption font-semibold text-warning">
            No destination group is configured here or on the bridge phone. Reports are not prepared and Test Send
            is unavailable until a WhatsApp destination group is set.
          </p>
        ) : null}
        <p className="text-caption text-muted-foreground">
          {dirty ? "Save your changes before a test send. " : ""}
          Test Send prepares a TEST REPORT from recent reports; it does not affect the regular reports. The bridge
          phone checks every 15 minutes and shows a notification when a report is ready. {SHARE_INSTRUCTION} A report
          shows as Sent only after the operator confirms it on the bridge phone; opening WhatsApp alone is shown as
          Opened in WhatsApp.
        </p>
      </CardContent>
    </Card>
  );
}

function ReportActions({ r, compact = false }: { r: ConsolidatedReport; compact?: boolean }) {
  const toast = useToast();
  const resend = useResend();
  const base = `/api/reports/consolidated/${encodeURIComponent(r.id)}/pdf`;
  const link = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-caption font-semibold text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    compact ? "h-10" : "h-11 flex-1",
  );
  return (
    <div className={cn("flex gap-2", compact ? "justify-end" : "")}>
      <a href={base} target="_blank" rel="noopener" className={link}>
        <Eye className="size-4" aria-hidden /> View
      </a>
      <a href={`${base}?download=1`} className={link}>
        <Download className="size-4" aria-hidden /> Download
      </a>
      <Button
        variant="outline"
        size="md"
        isLoading={resend.isPending}
        onClick={() =>
          resend.mutate(r.id, {
            onSuccess: () =>
              toast.success({ title: "Ready to send again", description: `The bridge phone shows it at its next check. ${SHARE_INSTRUCTION}` }),
            onError: (e) => toast.error({ title: "Not queued", description: errorMessage(e) }),
          })
        }
        className={cn("justify-center text-caption font-semibold", compact ? "h-10" : "h-11 flex-1")}
        leftIcon={<Send className="size-4" aria-hidden />}
      >
        Resend
      </Button>
    </div>
  );
}

function History() {
  const history = useConsolidatedHistory();
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
  const pdf = (r: ConsolidatedReport) => (
    <Badge variant={r.pdfStatus === "generated" ? "success" : "danger"}>PDF: {r.pdfStatus === "generated" ? "Generated" : "Failed"}</Badge>
  );
  const delivery = (r: ConsolidatedReport) => (
    <Badge variant={DELIVERY_STATUS[r.whatsappStatus].variant} dot>
      {DELIVERY_STATUS[r.whatsappStatus].label}
    </Badge>
  );

  return (
    <div className="@container space-y-3">
      <ul className="space-y-2 @3xl:hidden">
        {items.map((r) => {
          const p = periodText(r.periodStart, r.periodEnd);
          return (
            <li key={r.id} className="space-y-2.5 rounded-card border border-border bg-card p-3 text-caption">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-body font-semibold text-foreground">{p.date}</span>
                {r.kind === "test" ? <Badge variant="warning">TEST</Badge> : null}
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Reporting period</dt>
                <dd className="text-foreground">{p.time}</dd>
                <dt className="text-muted-foreground">Reports</dt>
                <dd className="text-foreground">{count(r)}</dd>
                <dt className="text-muted-foreground">Prepared at</dt>
                <dd className="text-foreground">{formatShort(r.generatedAt)}</dd>
                <dt className="text-muted-foreground">Opened in WhatsApp at</dt>
                <dd className="text-foreground">{formatShort(r.openedAt)}</dd>
                <dt className="text-muted-foreground">Sent at</dt>
                <dd className="text-foreground">{r.sentAt ? `${formatShort(r.sentAt)} (confirmed)` : "—"}</dd>
                <dt className="text-muted-foreground">Delivery status</dt>
                <dd>{delivery(r)}</dd>
                {r.errorMessage ? (
                  <>
                    <dt className="text-muted-foreground">Problem</dt>
                    <dd className="break-words text-danger">{r.errorMessage}</dd>
                  </>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-1.5">{pdf(r)}</div>
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
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Reporting period</th>
                <th className="px-3 py-2.5 font-semibold">Reports</th>
                <th className="px-3 py-2.5 font-semibold">PDF</th>
                <th className="px-3 py-2.5 font-semibold">Delivery status</th>
                <th className="px-3 py-2.5 font-semibold">Prepared at</th>
                <th className="px-3 py-2.5 font-semibold">Opened in WhatsApp at</th>
                <th className="px-3 py-2.5 font-semibold">Sent at</th>
                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((r) => {
                const p = periodText(r.periodStart, r.periodEnd);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-2.5 text-foreground">
                      {p.date}
                      {r.kind === "test" ? <Badge variant="warning" className="ml-1.5">TEST</Badge> : null}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{p.time}</td>
                    <td className="px-3 py-2.5 text-foreground">{count(r)}</td>
                    <td className="px-3 py-2.5">{pdf(r)}</td>
                    <td className="px-3 py-2.5">{delivery(r)}</td>
                    <td className="px-3 py-2.5 text-foreground">{formatShort(r.generatedAt)}</td>
                    <td className="px-3 py-2.5 text-foreground">{formatShort(r.openedAt)}</td>
                    <td className="px-3 py-2.5 text-foreground">{r.sentAt ? `${formatShort(r.sentAt)} (confirmed)` : "—"}</td>
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
    <ReportsGate>
      {() => (
        <div className="space-y-6">
          <SettingsPanel />
          <section className="space-y-3">
            <h2 className="text-subheading text-foreground">Report history</h2>
            <History />
          </section>
        </div>
      )}
    </ReportsGate>
  );
}
