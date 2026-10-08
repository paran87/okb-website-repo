/**
 * Operations media sections. Each section reads photos and videos from a
 * folder (key prefix) of the OKB WhatsApp bridge R2 bucket; a section without
 * a folder shows an empty gallery until one is assigned.
 */
export const OPERATIONS_SECTIONS = [
  {
    id: "ncr-daily",
    label: "NCR Daily Accomplishment",
    prefix: "NCR Daily Accomplishment/",
  },
  {
    id: "declogging",
    label: "Declogging/Clearing/Cleaning Operations",
    prefix: null,
  },
] as const satisfies readonly { id: string; label: string; prefix: string | null }[];

export type OperationsSectionId = (typeof OPERATIONS_SECTIONS)[number]["id"];
export type OperationsMediaKind = "photos" | "videos";

export function isOperationsSection(value: string | null): value is OperationsSectionId {
  return OPERATIONS_SECTIONS.some((s) => s.id === value);
}

export function operationsSection(id: OperationsSectionId) {
  return OPERATIONS_SECTIONS.find((s) => s.id === id)!;
}
