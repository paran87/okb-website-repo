"use client";

import { Clock } from "lucide-react";
import { cn } from "@/utils/cn";

interface TimePickerProps {
  /** Value in 24h "HH:mm" format. */
  value?: string;
  onChange?: (value: string) => void;
  minuteStep?: number;
  disabled?: boolean;
  className?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Hour/minute time picker built from accessible selects. */
export function TimePicker({
  value = "",
  onChange,
  minuteStep = 5,
  disabled = false,
  className,
}: TimePickerProps) {
  const [hour = "", minute = ""] = value.split(":");

  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => pad(i * minuteStep),
  );

  const update = (h: string, m: string) => {
    onChange?.(`${h || "00"}:${m || "00"}`);
  };

  const selectClass =
    "h-10 rounded-lg border border-border bg-card px-2 text-body text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Clock className="size-4 text-muted-foreground" aria-hidden />
      <select
        aria-label="Hour"
        disabled={disabled}
        value={hour}
        onChange={(e) => update(e.target.value, minute)}
        className={selectClass}
      >
        <option value="">HH</option>
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select
        aria-label="Minute"
        disabled={disabled}
        value={minute}
        onChange={(e) => update(hour, e.target.value)}
        className={selectClass}
      >
        <option value="">MM</option>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
