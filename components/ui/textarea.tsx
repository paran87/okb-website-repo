import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** Multi-line text input. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid, className, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-lg border bg-card px-3 py-2 text-body text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
          invalid
            ? "border-danger focus:border-danger"
            : "border-border focus:border-ring",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
