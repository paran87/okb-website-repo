"use client";

import { useEffect } from "react";
import "@/styles/globals.css";

/**
 * Root-level error boundary. Catches errors thrown in the root layout itself and
 * therefore must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md text-center">
          <p className="text-label text-danger">Critical error</p>
          <h1 className="mt-2 text-heading">The application failed to load</h1>
          <p className="mt-2 text-body text-muted-foreground">
            An unexpected error occurred at the application root. Please try
            reloading.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-body font-medium text-primary-foreground hover:opacity-90"
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
