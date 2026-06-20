"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Palette,
  Sparkles,
  Send,
  Film,
  GitBranch,
  FileText,
  Globe,
  Share2,
  Building2,
  Map as MapIcon,
  BarChart3,
  Users,
  FileUp,
  Phone,
  MoreHorizontal,
} from "lucide-react";

const FONT = "var(--font), var(--font-manrope), system-ui, sans-serif";

interface Tool {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface ToolGroup {
  title: string;
  tools: Tool[];
}

// Curated launcher — the high-frequency instruments, not the full 40-route
// inventory. "More" opens ⌘K, which indexes everything. Tool internals are
// untouched; these are entry points only.
const GROUPS: ToolGroup[] = [
  {
    title: "STUDIO",
    tools: [
      { label: "Creative", href: "/admin/studio/creative", icon: Palette },
      { label: "Ad Generator", href: "/admin/studio/ad-generator", icon: Sparkles },
      { label: "Publisher", href: "/admin/studio/publisher", icon: Send },
      { label: "Video", href: "/admin/studio/video", icon: Film },
    ],
  },
  {
    title: "CHANNELS",
    tools: [
      { label: "Funnels", href: "/admin/channels/funnels", icon: GitBranch },
      { label: "Landing Pages", href: "/admin/channels/landing-pages", icon: FileText },
      { label: "Google Business", href: "/admin/channels/gbp", icon: Globe },
      { label: "Social", href: "/admin/channels/social", icon: Share2 },
    ],
  },
  {
    title: "INTELLIGENCE",
    tools: [
      { label: "Occupancy", href: "/admin/intelligence/occupancy", icon: Building2 },
      { label: "Market", href: "/admin/intelligence/market", icon: MapIcon },
      { label: "Revenue", href: "/admin/intelligence/revenue", icon: BarChart3 },
      { label: "Reports", href: "/admin/reports", icon: FileText },
    ],
  },
  {
    title: "FACILITIES",
    tools: [
      { label: "Facility Manager", href: "/admin/facilities", icon: Building2 },
      { label: "Tenants", href: "/admin/facilities/tenants", icon: Users },
      { label: "PMS Queue", href: "/admin/pms-queue", icon: FileUp },
      { label: "Calls", href: "/admin/facilities/call-tracking", icon: Phone },
    ],
  },
];

const tile: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 11px",
  background: "var(--card)",
  border: "1px solid var(--bdr)",
  borderRadius: 8,
  textDecoration: "none",
  cursor: "pointer",
  transition: "background 120ms ease, border-color 120ms ease",
};

const moreTile: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 11px",
  background: "transparent",
  border: "1px dashed var(--bdr-strong)",
  borderRadius: 8,
  cursor: "pointer",
};

function hoverOn(el: HTMLElement) {
  el.style.background = "var(--hover-bg)";
  el.style.borderColor = "var(--bdr-strong)";
}
function hoverOff(el: HTMLElement) {
  el.style.background = "var(--card)";
  el.style.borderColor = "var(--bdr)";
}

/** Tools as a launchable toolkit, scoped to the current facility selection. */
export function ConsoleToolkit({ scopeId }: { scopeId: string }) {
  const scoped = (href: string) =>
    scopeId && scopeId !== "all" ? `${href}?facility=${scopeId}` : href;
  const openPalette = () => window.dispatchEvent(new Event("admin:open-palette"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.13em",
              color: "var(--ink3)",
              marginBottom: 7,
            }}
          >
            {group.title}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {group.tools.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={scoped(t.href)}
                  style={tile}
                  onMouseEnter={(e) => hoverOn(e.currentTarget)}
                  onMouseLeave={(e) => hoverOff(e.currentTarget)}
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--ink)" }} />
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>
                    {t.label}
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={openPalette}
              style={moreTile}
              aria-label={`More ${group.title.toLowerCase()} tools`}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <MoreHorizontal className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink3)" }} />
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: "var(--ink3)" }}>
                More
              </span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
