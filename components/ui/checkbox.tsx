import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

/** Accessible checkbox with a custom control (native input drives state). */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={cn(
          "group inline-flex cursor-pointer items-center gap-2.5 text-body text-foreground",
          props.disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span className="relative inline-flex">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className="peer size-4 shrink-0 cursor-pointer appearance-none rounded border border-border bg-card transition-colors checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring/50"
            {...props}
          />
          <Check
            className="pointer-events-none absolute left-0 top-0 size-4 scale-75 text-primary-foreground opacity-0 transition peer-checked:opacity-100"
            aria-hidden
          />
        </span>
        {label ? <span>{label}</span> : null}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
