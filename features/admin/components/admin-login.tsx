"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OkbLogo } from "@/components/brand/okb-logo";
import { useSignIn } from "@/features/admin/hooks/use-admin";
import type { AdminState } from "@/features/admin/types";

export function AdminLogin({ state }: { state: AdminState }) {
  const signIn = useSignIn();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signIn.mutate({ name: name.trim(), key });
  };

  return (
    <div className="admin-login flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="admin-login__emblem">
            <OkbLogo size={56} priority />
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-wide text-foreground">OKB Admin</h1>
          <p className="mt-1 text-caption text-muted-foreground">Manage the OKB website and Command Center</p>
        </div>

        {state.configured ? (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl">
            <label className="block space-y-1.5">
              <span className="text-caption font-medium text-foreground">Your name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                leftIcon={<UserRound className="size-4" aria-hidden />}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-caption font-medium text-foreground">Admin key</span>
              <Input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="current-password"
                required
                leftIcon={<KeyRound className="size-4" aria-hidden />}
              />
            </label>
            {signIn.error ? <p className="text-caption text-danger">{signIn.error.message}</p> : null}
            <button
              type="submit"
              disabled={signIn.isPending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-body font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
            >
              {signIn.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
              Sign in
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5 text-caption text-foreground">
            <p className="font-semibold">Admin access is not configured</p>
            <p className="mt-1 text-muted-foreground">
              Set <code className="rounded bg-muted px-1 font-mono">OKB_ADMIN_KEY</code> in Vercel → Settings → Environment
              Variables, then redeploy.
            </p>
          </div>
        )}

        <Link
          href="/"
          className="mx-auto mt-6 flex h-10 w-fit items-center gap-1.5 rounded-lg px-3 text-caption font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to the OKB website
        </Link>
      </div>
    </div>
  );
}
