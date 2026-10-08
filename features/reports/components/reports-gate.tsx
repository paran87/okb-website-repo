"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { DatabaseZap, FlaskConical, KeyRound, LogOut, PlugZap, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportsAccessState } from "@/features/reports/types";
import { ReportsApiError, useGrantAccess, useReportsAccess, useRevokeAccess } from "@/features/reports/hooks/use-reports";

function NotConnected() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <PlugZap className="size-7" aria-hidden />
        </div>
        <p className="text-subheading text-foreground">Reports backend is not connected</p>
        <p className="max-w-[36rem] text-body text-muted-foreground">
          Incoming WhatsApp and Viber reports are stored by the OKB Bridge in Supabase. Set{" "}
          <code className="rounded bg-muted px-1 font-mono text-[12px]">OKB_BRIDGE_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-muted px-1 font-mono text-[12px]">OKB_BRIDGE_SUPABASE_SERVICE_ROLE_KEY</code> on the
          server to connect. No placeholder reports are shown.
        </p>
      </CardContent>
    </Card>
  );
}

function AccessForm({ state }: { state: ReportsAccessState }) {
  const grant = useGrantAccess();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");

  if (!state.accessConfigured) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
            <ShieldCheck className="size-7" aria-hidden />
          </div>
          <p className="text-subheading text-foreground">Operator access is not configured</p>
          <p className="max-w-[36rem] text-body text-muted-foreground">
            Reports contain message content and sender names, so they are only served to authorized operators. Set{" "}
            <code className="rounded bg-muted px-1 font-mono text-[12px]">OKB_REPORTS_ACCESS_KEY</code> on the server (or
            enable a login provider) to allow access.
          </p>
        </CardContent>
      </Card>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    grant.mutate({ accessKey: key, operatorName: name.trim() });
  };
  const error = grant.error instanceof ReportsApiError ? grant.error.message : grant.error ? "Access could not be granted." : null;

  return (
    <Card className="mx-auto max-w-[28rem]">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-subheading text-foreground">Operator access</p>
            <p className="text-caption text-muted-foreground">
              Reports contain WhatsApp/Viber message content. Your name is recorded on reviews and incidents you create.
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Operator name" htmlFor="okb-operator" required>
            <Input
              id="okb-operator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="e.g. J. Santos — NCR OpCen"
              maxLength={80}
              leftIcon={<UserRound className="size-4" aria-hidden />}
            />
          </Field>
          <Field label="Access key" htmlFor="okb-access-key" required error={error ?? undefined}>
            <Input
              id="okb-access-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="current-password"
              invalid={Boolean(error)}
            />
          </Field>
          <Button type="submit" className="w-full justify-center" isLoading={grant.isPending} disabled={name.trim().length < 2 || !key}>
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Persistent strip: data source, signed-in operator, sign out. */
export function ReportsContextBar({ state }: { state: ReportsAccessState }) {
  const revoke = useRevokeAccess();
  return (
    <div className="space-y-2">
      {state.dataSource === "fixtures" ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-dashed border-warning/60 bg-warning/10 px-3 py-2 text-caption font-semibold text-warning"
        >
          <FlaskConical className="size-4 shrink-0" aria-hidden />
          DEVELOPMENT FIXTURES — example reports for local development only. This is not operational data.
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground sm:gap-x-4 sm:gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <DatabaseZap className="size-3.5 text-primary" aria-hidden />
          Source: {state.dataSource === "supabase" ? "OKB Bridge · Supabase (live)" : "Development fixtures"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="size-3.5" aria-hidden />
          Operator: <span className="font-medium text-foreground">{state.operatorName}</span>
        </span>
        {!state.reviewEnabled ? <span className="text-warning">Review actions unavailable (bridge API not configured)</span> : null}
        {state.accessGateDisabled ? (
          <span className="hidden sm:inline">Open view · no access key needed here</span>
        ) : null}
        {state.dataSource === "supabase" && !state.accessGateDisabled ? (
          <button
            type="button"
            onClick={() => revoke.mutate()}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-3.5" aria-hidden />
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Renders children only for an authorized operator with a connected backend. */
export function ReportsGate({
  children,
  area = "reports",
  bare = false,
}: {
  children: (state: ReportsAccessState) => ReactNode;
  /** "settings" asks for the operator access key; the report pages are open. */
  area?: "reports" | "settings";
  /** Without the source / operator strip (full-screen map layouts). */
  bare?: boolean;
}) {
  const access = useReportsAccess(area);
  if (access.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  if (access.isError) {
    return (
      <Card>
        <ErrorState
          title="Unable to retrieve reports"
          description="Unable to retrieve reports. Check backend connection."
          onRetry={() => access.refetch()}
        />
      </Card>
    );
  }
  const state = access.data;
  if (state.dataSource === "not_configured") return <NotConnected />;
  if (!state.granted) return <AccessForm state={state} />;
  if (bare) return <>{children(state)}</>;
  return (
    <div className="space-y-3 sm:space-y-4">
      <ReportsContextBar state={state} />
      {children(state)}
    </div>
  );
}
