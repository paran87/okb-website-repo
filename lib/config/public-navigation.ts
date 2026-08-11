import { PUBLIC_ROUTES } from "@/lib/constants";

export interface PublicNavItem {
  label: string;
  href: string;
  emphasis?: boolean;
  openInNewTab?: boolean;
}

/** Top navigation for the public Oplan Kontra Baha website. */
export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
  { label: "Home", href: PUBLIC_ROUTES.home },
  { label: "About", href: PUBLIC_ROUTES.about },
  { label: "Initiatives", href: PUBLIC_ROUTES.initiatives },
  { label: "Activity", href: PUBLIC_ROUTES.activity },
  { label: "Advisories", href: PUBLIC_ROUTES.advisories },
  { label: "Profile", href: PUBLIC_ROUTES.profile },
  { label: "Contact", href: PUBLIC_ROUTES.contact },
  {
    label: "OKB Command Center",
    href: PUBLIC_ROUTES.commandCenter,
    emphasis: true,
    openInNewTab: true,
  },
] as const;
