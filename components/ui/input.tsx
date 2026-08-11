import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** Text input with optional icons and error state. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-10 w-full rounded-lg border bg-card text-body text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
            leftIcon ? "pl-9" : "pl-3",
            rightIcon ? "pr-9" : "pr-3",
            invalid
              ? "border-danger focus:border-danger"
              : "border-border focus:border-ring",
            className,
          )}
          {...props}
        />
        {rightIcon ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {rightIcon}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
