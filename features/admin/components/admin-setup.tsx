"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Copy, Database, ExternalLink, HardDrive, KeyRound, Loader2, LogOut, RefreshCw, Stethoscope, XCircle } from "lucide-react";
import { AdminCard } from "@/features/admin/components/admin-ui";
import { useAdminState, useDirectUploads, useSetupSql, useSignOut, useStorageCheck } from "@/features/admin/hooks/use-admin";
import type { AdminState } from "@/features/admin/types";
import { cn } from "@/utils/cn";

function Check({ ok, title, children }: { ok: boolean | null; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 py-3">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Done" />
      ) : (
        <CircleAlert className={cn("mt-0.5 size-5 shrink-0", ok === null ? "text-muted-foreground" : "text-warning")} aria-label="To do" />
      )}
      <div className="min-w-0">
        <p className="text-body font-semibold text-foreground">{title}</p>
        <div className="text-caption text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 font-mono text-[12px] text-foreground">{children}</code>;
}

function SqlStep() {
  const sql = useSetupSql(true);
  const refresh = useAdminState();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!sql.data) return;
    try {
      await navigator.clipboard.writeText(sql.data.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* the SQL is selectable below */
    }
  };
  return (
    <AdminCard title="Switch on visitor tracking" icon={<Database className="size-4" aria-hidden />}>
      <ol className="list-decimal space-y-2 pl-5 text-caption text-foreground">
        <li>Open the Supabase SQL editor of the OKB Bridge project.</li>
        <li>Paste the SQL below and press Run. It only adds new tables; nothing existing is changed.</li>
        <li>Come back and press Check again. Visits are counted from then on.</li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          disabled={!sql.data}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-caption font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Copy className="size-4" aria-hidden /> {copied ? "Copied" : "Copy SQL"}
        </button>
        {sql.data?.sqlEditorUrl ? (
          <a
            href={sql.data.sqlEditorUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-caption font-semibold text-foreground hover:bg-muted"
          >
            <ExternalLink className="size-4" aria-hidden /> Open SQL editor
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => refresh.refetch()}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-caption font-semibold text-foreground hover:bg-muted"
        >
          <RefreshCw className={cn("size-4", refresh.isFetching && "animate-spin")} aria-hidden /> Check again
        </button>
      </div>
      <pre className="mt-4 max-h-64 max-w-full overflow-auto rounded-xl bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {sql.data?.sql ?? "Loading…"}
      </pre>
    </AdminCard>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all text-right text-caption text-foreground">{children}</dd>
    </div>
  );
}

/** Length/format of a credential vs what R2 issues (never the value). */
function CredentialShape({
  shape,
  expected,
}: {
  shape: { length: number; hex: boolean; strayChars: boolean } | null;
  expected: number;
}) {
  if (!shape) return <span className="text-danger">not set</span>;
  const problems: string[] = [];
  if (shape.length !== expected) problems.push(`should be ${expected}`);
  if (!shape.hex) problems.push("should be only digits and a–f");
  if (shape.strayChars) problems.push("has spaces or hidden characters");
  return (
    <span className={problems.length ? "text-danger" : "text-success"}>
      {shape.length} characters{shape.hex ? ", hex" : ""}
      {problems.length ? ` — ${problems.join("; ")}` : " ✓"}
    </span>
  );
}

/** Tests the R2 key: list, upload, delete — with the fix for each failure. */
function StorageCheckCard() {
  const check = useStorageCheck();
  const r = check.data;
  return (
    <AdminCard title="Storage check" icon={<Stethoscope className="size-4" aria-hidden />}>
      <p className="text-caption text-muted-foreground">
        Tests the Cloudflare R2 key the site uses: it lists the bucket, uploads a small test file and deletes it again.
      </p>
      <button
        type="button"
        onClick={() => check.mutate()}
        disabled={check.isPending}
        className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-caption font-semibold text-primary-foreground disabled:opacity-60"
      >
        {check.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Stethoscope className="size-4" aria-hidden />}
        {r ? "Run again" : "Run storage check"}
      </button>
      {check.error ? <p className="mt-3 text-caption text-danger">{check.error.message}</p> : null}
      {r ? (
        <div className="mt-4 space-y-3">
          {!r.configured ? (
            <p className="text-caption text-danger">
              R2 is not configured: set <Code>OPERATIONS_R2_ACCOUNT_ID</Code>, <Code>OPERATIONS_R2_ACCESS_KEY_ID</Code>,{" "}
              <Code>OPERATIONS_R2_SECRET_ACCESS_KEY</Code> and <Code>OPERATIONS_R2_BUCKET</Code> in Vercel.
            </p>
          ) : (
            <>
              <dl className="divide-y divide-border rounded-xl border border-border px-3">
                <Row label="Bucket">
                  <Code>{r.bucket}</Code>{" "}
                  <span className="text-muted-foreground">{r.bucketFromEnv ? "(OPERATIONS_R2_BUCKET)" : "(default — OPERATIONS_R2_BUCKET not set)"}</span>
                </Row>
                <Row label="Account">{r.account}</Row>
                <Row label="Endpoint">{r.host}</Row>
                <Row label="Endpoint from">
                  {[r.env.endpointVar, r.env.jurisdictionVar].filter(Boolean).join(" + ") || "—"}
                </Row>
                <Row label="Key from">{r.env.accessKeyVar ?? "—"}</Row>
                <Row label="Access Key ID">
                  <CredentialShape shape={r.credentials.accessKeyId} expected={32} />
                </Row>
                <Row label="Secret Access Key">
                  <CredentialShape shape={r.credentials.secret} expected={64} />
                </Row>
              </dl>
              <ul className="space-y-2">
                {r.steps.map((step) => (
                  <li key={step.id} className="flex gap-2.5">
                    {step.ok ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Passed" />
                    ) : (
                      <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-label="Failed" />
                    )}
                    <div className="min-w-0">
                      <p className="text-caption font-semibold text-foreground">
                        {step.label}
                        {step.code ? <span className="ml-1.5 font-mono font-normal text-danger">{step.code}</span> : null}
                      </p>
                      {step.detail ? <p className="text-caption italic text-muted-foreground">Cloudflare: “{step.detail}”</p> : null}
                      {step.hint ? <p className="text-caption text-muted-foreground">{step.hint}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
              {r.otherJurisdiction ? (
                <div
                  className={cn(
                    "rounded-xl border p-3 text-caption",
                    r.otherJurisdiction.works ? "border-success/40 bg-success/10" : "border-border",
                  )}
                >
                  <p className="font-semibold text-foreground">
                    Tried the {r.otherJurisdiction.jurisdiction === "eu" ? "EU" : "default"} endpoint ({r.otherJurisdiction.host}):{" "}
                    {r.otherJurisdiction.works ? "it works with the same key." : "denied there too."}
                  </p>
                  {r.otherJurisdiction.fix ? <p className="mt-1 text-foreground">{r.otherJurisdiction.fix}</p> : (
                    <p className="mt-1 text-muted-foreground">
                      So the endpoint is not the problem: check that the key belongs to an active token with Object Read &amp;
                      Write on this bucket.
                    </p>
                  )}
                </div>
              ) : null}
              {r.ok ? (
                <p className="text-caption font-semibold text-success">Storage works. Uploads and the galleries can use this bucket.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </AdminCard>
  );
}

export function AdminSetup({ state }: { state: AdminState }) {
  const cors = useDirectUploads(state.storage.configured);
  const signOut = useSignOut();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-4">
        <AdminCard title="Status" icon={<HardDrive className="size-4" aria-hidden />} bodyClassName="px-4 py-1">
          <ul className="divide-y divide-border">
            <Check ok={!state.usingFallbackKey} title="Admin key">
              {state.usingFallbackKey ? (
                <>
                  You signed in with the operator access key. Set a separate <Code>OKB_ADMIN_KEY</Code> in Vercel →
                  Settings → Environment Variables so only admins can open this page.
                </>
              ) : (
                <>A dedicated admin key is set.</>
              )}
            </Check>
            <Check ok={state.supabase.configured} title="Supabase (visitor data)">
              {state.supabase.configured ? "Connected to the OKB Bridge project." : (
                <>
                  Set <Code>OKB_BRIDGE_SUPABASE_URL</Code> and <Code>OKB_BRIDGE_SUPABASE_SERVICE_ROLE_KEY</Code>.
                </>
              )}
            </Check>
            <Check ok={state.supabase.ready} title="Visitor tables">
              {state.supabase.ready ? "Visits, titles and captions are being saved." : "Run the setup SQL (next card)."}
            </Check>
            <Check ok={state.storage.configured} title="Photo & video storage (Cloudflare R2)">
              {state.storage.configured ? (
                <>
                  Bucket <Code>{state.storage.bucket}</Code>.
                </>
              ) : (
                <>
                  Set the <Code>OPERATIONS_R2_*</Code> variables.
                </>
              )}
            </Check>
            <Check
              ok={cors.data ? cors.data.status === "enabled" : null}
              title="Direct uploads (large videos)"
            >
              {cors.data?.status === "enabled" ? (
                "Set up automatically: browsers upload big files (up to 1 GB) straight to storage."
              ) : cors.data ? (
                <>
                  Could not be set up automatically: the R2 API token cannot change bucket settings. Files up to 4 MB still
                  upload. In Cloudflare → R2 → <Code>{state.storage.bucket ?? "the bucket"}</Code> → Settings → CORS policy, allow{" "}
                  <Code>{cors.data.origin}</Code> with methods PUT, GET, HEAD, all headers, and expose <Code>ETag</Code>.
                </>
              ) : (
                "Checking…"
              )}
            </Check>
          </ul>
        </AdminCard>
        <StorageCheckCard />
        <AdminCard title="Account" icon={<KeyRound className="size-4" aria-hidden />}>
          <p className="text-caption text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{state.name}</span>. The session ends after 12
            hours.
          </p>
          <button
            type="button"
            onClick={() => signOut.mutate()}
            className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-caption font-semibold text-foreground hover:bg-muted"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </AdminCard>
        <AdminCard title="Privacy" icon={<CheckCircle2 className="size-4" aria-hidden />}>
          <p className="text-caption text-muted-foreground">
            No IP addresses or names are stored. Each browser gets an anonymous random ID in a cookie, and the location
            is the city and country derived by Vercel for each request.
          </p>
        </AdminCard>
      </div>
      {state.supabase.configured && !state.supabase.ready ? <SqlStep /> : null}
      {state.supabase.ready ? (
        <AdminCard title="Visitor tracking is on" icon={<Database className="size-4" aria-hidden />}>
          <p className="text-caption text-muted-foreground">
            Every page view on the OKB website and the Command Center is counted. See Overview and Visitors.
          </p>
        </AdminCard>
      ) : null}
    </div>
  );
}
