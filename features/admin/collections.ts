import { OPERATIONS_SECTIONS } from "@/features/operations/config";
import type { MediaCollection, MediaKind } from "@/features/admin/types";

/**
 * Photo/video collections the admin manages. Each is a folder (key prefix) of
 * the operations R2 bucket:
 *  - Website gallery: shown on the public /gallery page.
 *  - Command Center: the Operations galleries (features/operations/config.ts).
 */
export const WEBSITE_GALLERY_PREFIX = "okb-website/gallery/";
export const WEBSITE_INSPECTIONS_PREFIX = "okb-website/inspections/";
export const WEBSITE_SUMMIT_PREFIX = "okb-website/summit/";
/** Folders whose files anyone can see on the public Gallery. */
export const WEBSITE_PUBLIC_PREFIXES = [WEBSITE_GALLERY_PREFIX, WEBSITE_INSPECTIONS_PREFIX, WEBSITE_SUMMIT_PREFIX] as const;

export interface CollectionConfig extends MediaCollection {
  prefix: string;
  /** Operations section id, for Command Center collections. */
  operationsSection: string | null;
}

export const MEDIA_COLLECTIONS: readonly CollectionConfig[] = [
  {
    id: "website-gallery",
    label: "Website · Gallery (OKB Photos and Videos)",
    area: "website",
    description: "Shown to the public on the OKB website Gallery page, in the OKB Photos and OKB Videos tabs.",
    prefix: WEBSITE_GALLERY_PREFIX,
    operationsSection: null,
  },
  {
    id: "website-inspections",
    label: "Website · Gallery (OKB Inspections)",
    area: "website",
    description: "Shown to the public in the OKB Inspections tab of the Gallery. Photos and videos both work.",
    prefix: WEBSITE_INSPECTIONS_PREFIX,
    operationsSection: null,
  },
  {
    id: "website-summit",
    label: "Website · Gallery (OKB Summit)",
    area: "website",
    description: "Shown to the public in the OKB Summit tab of the Gallery. Photos and videos both work.",
    prefix: WEBSITE_SUMMIT_PREFIX,
    operationsSection: null,
  },
  ...OPERATIONS_SECTIONS.flatMap((s) =>
    s.prefix
      ? [
          {
            id: `ops-${s.id}`,
            label: `Command Center · ${s.label}`,
            area: "command" as const,
            description: "Shown to operators in Command Center → Operations.",
            prefix: s.prefix,
            operationsSection: s.id,
          },
        ]
      : [],
  ),
];

export function mediaCollection(id: string | null | undefined): CollectionConfig | null {
  return MEDIA_COLLECTIONS.find((c) => c.id === id) ?? null;
}

export const MEDIA_TYPES: Record<MediaKind, RegExp> = {
  photo: /\.(jpe?g|png|webp|gif)$/i,
  video: /\.(mp4|m4v|mov|webm|3gp)$/i,
};

export function mediaKindOf(name: string): MediaKind | null {
  if (MEDIA_TYPES.photo.test(name)) return "photo";
  if (MEDIA_TYPES.video.test(name)) return "video";
  return null;
}

/** Largest upload accepted (direct to storage). */
export const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;
