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
    label: "Dredger Status",
    href: PUBLIC_ROUTES.dredgerStatus,
    description: "Live dredger deployment and operational status",
  },
  {
    label: "Accomplishment",
    href: PUBLIC_ROUTES.accomplishment,
    description: "Outputs and outcomes from the live dashboard",
  },
  {
    label: "Portfolio",
    href: PUBLIC_ROUTES.profile,
    description: "Program presentation and reference materials",
  },
  {
    label: "OKB Command Center",
    href: PUBLIC_ROUTES.commandCenter,
    description: "Live GIS monitoring for authorized personnel",
    emphasis: true,
    openInNewTab: true,
  },
] as const;
