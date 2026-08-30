import type { LucideIcon } from "lucide-react";
import { AppIcons } from "@/lib/config/icons";
import { ROUTES } from "@/lib/constants";
import { Permission } from "@/lib/rbac/permissions";

/** Shared fields for every navigation entry. */
interface NavItemBase {
  label: string;
  icon: LucideIcon;
  permission: Permission;
  /** Optional badge count or label (e.g. alert count). */
  badge?: string | number;
}

/** Leaf navigation link. */
export interface NavLinkItem extends NavItemBase {
  type: "link";
  href: string;
}

/** Expandable navigation group with nested children. */
export interface NavGroupItem extends NavItemBase {
  type: "group";
  /** Primary route when the group label is clicked. */
  href?: string;
  children: readonly NavLinkItem[];
}

export type NavEntry = NavLinkItem | NavGroupItem;

/**
 * Primary sidebar navigation with nested groups.
 * Each item is permission-gated so the sidebar only renders modules the
 * current role may access.
 */
export const NAV_ITEMS: readonly NavEntry[] = [
  {
    type: "link",
    label: "Dashboard",
    href: ROUTES.dashboard,
    icon: AppIcons.dashboard,
    permission: Permission.DASHBOARD_VIEW,
  },
  {
    type: "group",
    label: "Flood Monitoring",
    href: ROUTES.floodMonitoring,
    icon: AppIcons.floodMonitoring,
    permission: Permission.MAP_VIEW,
    badge: 3,
    children: [
      {
        type: "link",
        label: "Overview",
        href: ROUTES.floodMonitoring,
        icon: AppIcons.floodMonitoring,
        permission: Permission.MAP_VIEW,
      },
      {
        type: "link",
        label: "Critical Areas",
        href: ROUTES.criticalAreas,
        icon: AppIcons.criticalAreas,
        permission: Permission.CRITICAL_AREA_VIEW,
        badge: 2,
      },
      {
        type: "link",
        label: "Flood-prone Areas",
        href: ROUTES.floodProne,
        icon: AppIcons.floodProne,
        permission: Permission.FLOOD_PRONE_VIEW,
      },
      {
        type: "link",
        label: "Drainages",
        href: ROUTES.drainages,
        icon: AppIcons.drainages,
        permission: Permission.MAP_VIEW,
      },
    ],
  },
  {
    type: "link",
    label: "Incidents",
    href: ROUTES.incidents,
    icon: AppIcons.incidents,
    permission: Permission.INCIDENT_VIEW,
    badge: 5,
  },
  {
    type: "link",
    label: "Road Network",
    href: ROUTES.roads,
    icon: AppIcons.roads,
    permission: Permission.ROAD_VIEW,
  },
  {
    type: "link",
    label: "Waterways",
    href: ROUTES.waterways,
    icon: AppIcons.waterways,
    permission: Permission.WATERWAY_VIEW,
  },
  {
    type: "link",
    label: "Projects",
    href: ROUTES.projects,
    icon: AppIcons.projects,
    permission: Permission.PROJECT_VIEW,
  },
  {
    type: "link",
    label: "Equipment",
    href: ROUTES.equipment,
    icon: AppIcons.equipment,
    permission: Permission.EQUIPMENT_VIEW,
  },
  {
    type: "link",
    label: "Weather",
    href: ROUTES.weather,
    icon: AppIcons.weather,
    permission: Permission.WEATHER_VIEW,
  },
  {
    type: "link",
    label: "Reports",
    href: ROUTES.reports,
    icon: AppIcons.reports,
    permission: Permission.REPORT_VIEW,
  },
  {
    type: "link",
    label: "Analytics",
    href: ROUTES.analytics,
    icon: AppIcons.analytics,
    permission: Permission.ANALYTICS_VIEW,
  },
  {
    type: "link",
    label: "Users",
    href: ROUTES.users,
    icon: AppIcons.users,
    permission: Permission.USER_VIEW,
  },
  {
    type: "link",
    label: "Settings",
    href: ROUTES.settings,
    icon: AppIcons.settings,
    permission: Permission.SETTINGS_MANAGE,
  },
];

/** Flatten all leaf links for search / quick navigation. */
export function flattenNavLinks(
  items: readonly NavEntry[],
): readonly NavLinkItem[] {
  const links: NavLinkItem[] = [];
  for (const item of items) {
    if (item.type === "link") {
      links.push(item);
    } else {
      links.push(...item.children);
    }
  }
  return links;
}
