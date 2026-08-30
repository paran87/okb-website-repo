import Link from "next/link";
import { Compass } from "lucide-react";
import { ROUTES } from "@/lib/constants";

/** Command Center 404 — stays inside the operational shell. */
export default function CommandNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Compass className="size-7" aria-hidden />
        </div>
        <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Coming soon...
        </p>
        <p className="mt-2 text-body text-muted-foreground">
          This module is not available yet.
        </p>
        <Link
          href={ROUTES.dashboard}
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-body font-medium text-primary-foreground hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
