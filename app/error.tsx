"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/** Route-segment error boundary (App Router). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorState
        title="Something went wrong"
        description="We hit an unexpected error while loading this page. You can retry, or head back to the dashboard."
        onRetry={reset}
      />
    </div>
  );
}
