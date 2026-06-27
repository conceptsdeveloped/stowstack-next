import {
  LayoutDashboard,
  Megaphone,
  MapPin,
  BarChart3,
  Upload,
  MessageSquare,
  CreditCard,
  ClipboardCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for portal navigation.
 *
 * Three surfaces consume this list and historically disagreed on labels and
 * item sets:
 *  - the desktop sidebar (all items, `sidebarLabel`)
 *  - the header title bar (`headerTitle`, keyed by pathname)
 *  - the mobile bottom tabs (`tabLabel`, only items with `inBottomTab: true`)
 *
 * Keep per-surface labels here rather than re-deriving them in each component.
 * Order is the sidebar order; the bottom tabs render the `inBottomTab` subset in
 * this same order.
 */
export interface PortalNavItem {
  href: string;
  /** Label shown in the desktop sidebar. */
  sidebarLabel: string;
  /** Title shown in the header bar for this route. */
  headerTitle: string;
  /** Label shown in the mobile bottom tab (only when `inBottomTab`). */
  tabLabel?: string;
  /** Whether this item appears in the mobile bottom tab bar. */
  inBottomTab: boolean;
  icon: LucideIcon;
}

export const PORTAL_NAV: PortalNavItem[] = [
  { href: "/portal",            sidebarLabel: "Dashboard",  headerTitle: "Dashboard",  tabLabel: "Home",      inBottomTab: true,  icon: LayoutDashboard },
  { href: "/portal/campaigns",  sidebarLabel: "Campaigns",  headerTitle: "Campaigns",  tabLabel: "Campaigns", inBottomTab: true,  icon: Megaphone },
  { href: "/portal/gbp",        sidebarLabel: "GBP",        headerTitle: "Reviews",    tabLabel: "Reviews",   inBottomTab: true,  icon: MapPin },
  { href: "/portal/reports",    sidebarLabel: "Reports",    headerTitle: "Reports",    tabLabel: "Reports",   inBottomTab: true,  icon: BarChart3 },
  { href: "/portal/upload",     sidebarLabel: "Upload",     headerTitle: "Upload",     tabLabel: "Upload",    inBottomTab: true,  icon: Upload },
  { href: "/portal/messages",   sidebarLabel: "Messages",   headerTitle: "Messages",   tabLabel: "Messages",  inBottomTab: true,  icon: MessageSquare },
  { href: "/portal/billing",    sidebarLabel: "Billing",    headerTitle: "Billing",    inBottomTab: false, icon: CreditCard },
  { href: "/portal/onboarding", sidebarLabel: "Onboarding", headerTitle: "Onboarding", inBottomTab: false, icon: ClipboardCheck },
  { href: "/portal/settings",   sidebarLabel: "Settings",   headerTitle: "Settings",   tabLabel: "Settings",  inBottomTab: true,  icon: Settings },
];

/** Items rendered in the mobile bottom tab bar, in sidebar order. */
export const PORTAL_BOTTOM_TABS = PORTAL_NAV.filter((item) => item.inBottomTab);

/** Lookup of pathname → header title. */
export const PORTAL_TITLES: Record<string, string> = Object.fromEntries(
  PORTAL_NAV.map((item) => [item.href, item.headerTitle]),
);

/**
 * Whether `href` is the active nav item for the current `pathname`.
 * The dashboard root (`/portal`) matches exactly; everything else matches by
 * prefix so nested routes keep their parent tab active.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  return href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
}
