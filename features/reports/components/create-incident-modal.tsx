"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SkeletonText } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/constants";
import type { CreateIncidentInput, IncidentSeverity, ReportDetail } from "@/features/reports/types";
import { INCIDENT_TYPES, SEVERITY_META } from "@/features/reports/lib/labels";
import { describeObservation, isFlooded, provided } from "@/features/reports/lib/observations";
import { useCreateIncident, useReportDetail } from "@/features/reports/hooks/use-reports";

const SEVERITIES: IncidentSeverity[] = ["low", "moderate", "high", "critical"];

function Form({ report, onDone }: { report: ReportDetail; onDone: () => void }) {
  const create = useCreateIncident(report.id);
  const admin = report.extraction?.administrative;
  const obs = report.observations;
  const firstFlooded = obs.find((o) => isFlooded(o.condition)) ?? null;

  const [locIndex, setLocIndex] = useState<string>(firstFlooded ? String(firstFlooded.index) : "none");
  const selected = obs.find((o) => String(o.index) === locIndex) ?? null;
  const [title, setTitle] = useState(firstFlooded ? `Flooding — ${firstFlooded.label}` : "");
  const [incidentType, setIncidentType] = useState<string>("flooding");
  const [severity, setSeverity] = useState<IncidentSeverity | "">("");
  const [locationText, setLocationText] = useState(firstFlooded?.label ?? "");
  const [description, setDescription] = useState("");

  const chooseLocation = (value: string) => {
    const o = obs.find((x) => String(x.index) === value) ?? null;
    setLocIndex(value);
    setLocationText(o?.label ?? "");
    setTitle(o ? `Flooding — ${o.label}` : "");
  };

  const isMonitoringClear = obs.length > 0 && obs.every((o) => !isFlooded(o.condition));
  const locationOptions = useMemo(
    () => [
      { value: "none", label: "Whole report / not location-specific" },
      ...obs.map((o) => ({ value: String(o.index), label: `${o.label} — ${describeObservation(o)}` })),
    ],
    [obs],
  );

  if (create.isSuccess) {
    const incident = create.data.data;
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <div>
          <p className="text-subheading text-foreground">Incident {incident.code} created</p>
          <p className="text-caption text-muted-foreground">Linked to source report {report.reference}.</p>
        </div>
        <div className="flex justify-center gap-2">
          <Link href={`${ROUTES.incidents}?incident=${incident.id}`} className="text-body font-semibold text-primary hover:underline">
            View incident
          </Link>
          <Button variant="outline" size="sm" onClick={onDone}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  const input: CreateIncidentInput = {
    title: title.trim(),
    incidentType,
    severity: (severity || "moderate") as IncidentSeverity,
    sourceLocationIndex: selected ? selected.index : null,
    locationText: locationText.trim() || null,
    region: provided(admin?.region),
    province: provided(admin?.province),
    municipality: provided(admin?.municipality),
    description: description.trim() || null,
  };
  const valid = input.title.length >= 3 && Boolean(severity);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) create.mutate(input);
      }}
    >
      {isMonitoringClear ? (
        <div className="flex gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-caption text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <p>
            This report does not state active flooding at any listed location. Periodic monitoring updates normally stay
            reports; create an incident only if you have confirmed an actionable situation.
          </p>
        </div>
      ) : null}
      <Field label="Source location" description="Pre-fills the incident location from the report's extracted data.">
        <Select options={locationOptions} value={locIndex} onChange={chooseLocation} />
      </Field>
      <Field label="Incident title" htmlFor="inc-title" required>
        <Input id="inc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Incident type" required>
          <Select options={INCIDENT_TYPES.map((t) => ({ value: t.value, label: t.label }))} value={incidentType} onChange={setIncidentType} />
        </Field>
        <Field label="Severity (operator assessment)" required description="Not set by AI — your judgement.">
          <Select
            options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_META[s].label }))}
            value={severity}
            onChange={(v) => setSeverity(v as IncidentSeverity)}
            placeholder="Select severity…"
          />
        </Field>
      </div>
      <Field label="Location" htmlFor="inc-location">
        <Input id="inc-location" value={locationText} onChange={(e) => setLocationText(e.target.value)} maxLength={300} />
      </Field>
      <p className="text-caption text-muted-foreground">
        Region / province / municipality (from report):{" "}
        <span className="text-foreground">
          {[input.region, input.province, input.municipality].filter(Boolean).join(" · ") || "Not reported"}
        </span>
      </p>
      <Field label="Operator notes" htmlFor="inc-notes">
        <Textarea id="inc-notes" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={4000} />
      </Field>
      {create.isError ? <p className="text-caption text-danger">{create.error.message}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" isLoading={create.isPending} disabled={!valid}>
          Create Incident
        </Button>
      </div>
    </form>
  );
}

/** Operator-confirmed promotion of a report to an incident (never automatic). */
export function CreateIncidentModal({ reportId, onClose }: { reportId: string | null; onClose: () => void }) {
  const detail = useReportDetail(reportId);
  const report = detail.data?.data;
  return (
    <Modal
      open={Boolean(reportId)}
      onClose={onClose}
      size="xl"
      title="Create Incident from Report"
      description={report ? `Source: ${report.reference} · the incident keeps a permanent link to this report.` : undefined}
    >
      {!report ? (
        detail.isError ? (
          <p className="text-body text-danger">{detail.error.message}</p>
        ) : (
          <SkeletonText lines={6} />
        )
      ) : report.incidentStorage === "not_configured" ? (
        <p className="text-body text-muted-foreground">
          Incident storage is not set up. Apply the migration in <code>supabase/migrations/</code> to the OKB Bridge Supabase
          project.
        </p>
      ) : (
        <Form key={report.id} report={report} onDone={onClose} />
      )}
    </Modal>
  );
}
