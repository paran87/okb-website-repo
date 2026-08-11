import { Spinner } from "@/components/ui/spinner";

/** Global route loading boundary (App Router Suspense fallback). */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner size="lg" label="Loading…" />
    </div>
  );
}
