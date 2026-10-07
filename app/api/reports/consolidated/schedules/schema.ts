import { z } from "zod";
import { MAX_SCHEDULE_PERIOD_DAYS } from "@/features/consolidated-reports/types";

const MAX_PERIOD_MS = MAX_SCHEDULE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/** A report schedule entry (ISO, UTC); the backend checks it again, including "not in the past". */
export const scheduleSchema = z
  .object({
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    sendAt: z.string().datetime(),
  })
  .refine((s) => Date.parse(s.periodStart) < Date.parse(s.periodEnd), {
    message: "The monitoring period must start before it ends",
    path: ["periodEnd"],
  })
  .refine((s) => Date.parse(s.periodEnd) - Date.parse(s.periodStart) <= MAX_PERIOD_MS, {
    message: `The monitoring period can be at most ${MAX_SCHEDULE_PERIOD_DAYS} days`,
    path: ["periodEnd"],
  })
  .refine((s) => Date.parse(s.sendAt) >= Date.parse(s.periodEnd), {
    message: "The date of sending must be at or after the end of the monitoring period",
    path: ["sendAt"],
  });
