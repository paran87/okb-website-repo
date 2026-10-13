"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Copy, Database, ExternalLink, HardDrive, KeyRound, LogOut, RefreshCw } from "lucide-react";
import { AdminCard } from "@/features/admin/components/admin-ui";
import { useAdminState, useDirectUploads, useSetupSql, useSignOut } from "@/features/admin/hooks/use-admin";
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
              {cors.data?.status === "enabled"
                ? "Browsers can upload big files straight to storage."
                : "Turn on from the Media tab. Files up to 4 MB upload without it."}
            </Check>
          </ul>
        </AdminCard>
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
