import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and resolve Tailwind conflicts deterministically
 * (e.g. `p-2 p-4` -> `p-4`). Use everywhere instead of manual string concat.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
