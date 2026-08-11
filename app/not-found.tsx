import Link from "next/link";
import { Compass } from "lucide-react";

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
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-body font-medium text-primary-foreground hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
