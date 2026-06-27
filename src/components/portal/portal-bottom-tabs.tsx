"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PORTAL_BOTTOM_TABS, isNavItemActive } from "./portal-nav";

export function PortalBottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--color-light)]/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {PORTAL_BOTTOM_TABS.map((tab) => {
          const isActive = isNavItemActive(tab.href, pathname);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                isActive
                  ? "text-[var(--color-gold)] font-medium"
                  : "text-[var(--color-mid-gray)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.tabLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
