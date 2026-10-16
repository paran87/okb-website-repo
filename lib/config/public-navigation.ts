import { PUBLIC_ROUTES } from "@/lib/constants";

export interface PublicNavItem {
  label: string;
  href: string;
  /** Short supporting line shown in the mobile menu. */
  description?: string;
  emphasis?: boolean;
  openInNewTab?: boolean;
}

/** Top navigation for the public Oplan Kontra Baha website. */
export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
  {
    label: "OKB Framework",
    href: PUBLIC_ROUTES.framework,
    description: "Policy basis, principles, and the operational cycle",
  },
  {
    label: "Accomplishment",
    href: PUBLIC_ROUTES.accomplishment,
    description: "Outputs and outcomes from the live dashboard",
  },
  {
    label: "NCR Daily Accomplishment",
    href: PUBLIC_ROUTES.ncrDaily,
    description: "Daily accomplishment boards of NCR, latest first",
  },
  {
    label: "Portfolio",
    href: PUBLIC_ROUTES.profile,
    description: "Program presentation and reference materials",
  },
  {
    label: "Gallery",
    href: PUBLIC_ROUTES.gallery,
    description: "Photos and videos from the field",
  },
  {
    label: "OKB Command Center",
    href: PUBLIC_ROUTES.commandCenter,
    description: "Live GIS monitoring for authorized personnel",
    emphasis: true,
  },
] as const;
