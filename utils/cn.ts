import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge that knows the project's type-scale utilities (styles/globals.css `@utility text-*`) are font
 * sizes. Without this it takes e.g. `text-caption` for a text color and drops it next to `text-success`, so badges
 * and labels fell back to the inherited size.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "h4", "heading", "subheading", "body-lg", "body", "caption", "label", "button", "table", "map-label"] },
      ],
    },
  },
});

/**
 * Merge conditional class names and resolve Tailwind conflicts deterministically
 * (e.g. `p-2 p-4` -> `p-4`). Use everywhere instead of manual string concat.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
