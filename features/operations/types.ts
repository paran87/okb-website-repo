import type { OperationsMediaKind, OperationsSectionId } from "@/features/operations/config";

export interface OperationsMediaItem {
  key: string;
  name: string;
  kind: "photo" | "video";
  /** Short-lived signed link to the file in R2. */
  url: string;
  size: number;
  lastModified: string;
  /** Where the photo was taken; `approx` when located from the address printed on its stamp. */
  geotag: { lat: number; lng: number; approx: boolean } | null;
  /** Barangay / city of the geotag (reverse geocoded). */
  place: string | null;
  note: string | null;
}

export interface OperationsMediaList {
  section: OperationsSectionId;
  kind: OperationsMediaKind;
  /** False when the R2 bucket is not configured on the server. */
  configured: boolean;
  items: OperationsMediaItem[];
}
