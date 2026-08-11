import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/** Error state for failed data loads with an optional retry action. */
export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred while loading this content.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-danger/15 text-danger">
        <TriangleAlert className="size-7" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-subheading text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-body text-muted-foreground">
          {description}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
