import Link from "next/link";
import { Compass } from "lucide-react";
import { PUBLIC_ROUTES, ROUTES } from "@/lib/constants";

/** Global 404 page. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Compass className="size-7" aria-hidden />
        </div>
        <p className="mt-4 font-mono text-label text-primary">Error 404</p>
        <h1 className="mt-2 text-heading">Page not found</h1>
        <p className="mt-2 text-body text-muted-foreground">
          The page you are looking for doesn’t exist or has been moved.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={PUBLIC_ROUTES.home}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-body font-medium text-primary-foreground hover:opacity-90"
          >
            Back to home
          </Link>
          <Link
            href={ROUTES.dashboard}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-5 text-body font-medium text-foreground hover:bg-muted"
          >
            Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
