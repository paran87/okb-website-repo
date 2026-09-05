import { PUBLIC_ROUTES } from "@/lib/constants";

export interface PublicNavItem {
  label: string;
  href: string;
  emphasis?: boolean;
  openInNewTab?: boolean;
}

/** Top navigation for the public Oplan Kontra Baha website. */
export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
  { label: "OKB Framework", href: PUBLIC_ROUTES.framework },
  { label: "Activities", href: PUBLIC_ROUTES.activity },
  { label: "Accomplishment", href: PUBLIC_ROUTES.accomplishment },
  { label: "Portfolio", href: PUBLIC_ROUTES.profile },
  {
    label: "OKB Command Center",
    href: PUBLIC_ROUTES.commandCenter,
    emphasis: true,
    openInNewTab: true,
  },
] as const;
