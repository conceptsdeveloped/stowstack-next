"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { PORTAL_BOTTOM_TABS, isNavItemActive } from "./portal-nav";

export function PortalBottomTabs({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom navigation"
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
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                isActive
                  ? "text-[var(--color-dark)] font-medium"
                  : "text-[var(--color-mid-gray)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.tabLabel ?? tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-label="More navigation"
          aria-haspopup="dialog"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-[var(--color-mid-gray)] transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
