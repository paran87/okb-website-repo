import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({
  required = false,
  className,
  children,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        "block text-caption font-medium text-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </label>
  );
}

interface FieldProps {
  label?: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Form field wrapper: label + control + description/error. Standardizes spacing
 * and a11y wiring across all inputs.
 */
export function Field({
  label,
  htmlFor,
  description,
  error,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="text-caption text-danger">{error}</p>
      ) : description ? (
        <p className="text-caption text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
