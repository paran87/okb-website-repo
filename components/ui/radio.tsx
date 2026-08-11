import { cn } from "@/utils/cn";

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  orientation?: "vertical" | "horizontal";
  className?: string;
}

/** Accessible radio group. */
export function RadioGroup({
  name,
  value,
  onChange,
  options,
  orientation = "vertical",
  className,
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "flex gap-3",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        className,
      )}
    >
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2.5 text-body text-foreground",
              option.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="relative inline-flex size-4 items-center justify-center">
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={option.disabled}
                onChange={() => onChange?.(option.value)}
                className="peer size-4 cursor-pointer appearance-none rounded-full border border-border bg-card transition-colors checked:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <span className="pointer-events-none absolute size-2 scale-0 rounded-full bg-primary transition-transform peer-checked:scale-100" />
            </span>
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
