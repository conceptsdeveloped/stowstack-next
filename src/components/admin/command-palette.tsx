"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  CornerDownLeft,
  CreditCard,
  FileText,
  FileUp,
  Flame,
  GitBranch,
  Inbox,
  Kanban,
  LayoutGrid,
  LifeBuoy,
  LineChart,
  Mail,
  Megaphone,
  Palette,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Users,
} from "lucide-react";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useFacility } from "@/lib/facility-context";

const FONT = "var(--font), var(--font-manrope), system-ui, sans-serif";
const RECENTS_KEY = "storageads_palette_recents";

interface Destination {
  id: string;
  label: string;
  href: string;
  group: string;
  icon: LucideIcon;
}

// Mirrors the current admin sidebar routes. Phase 2 unifies this with the
// sidebar into one source; kept self-contained here to stay additive.
const DESTINATIONS: Destination[] = [
  { id: "leads", label: "Lead Pipeline", href: "/admin", group: "Leads", icon: Flame },
  { id: "kanban", label: "Kanban", href: "/admin/kanban", group: "Leads", icon: Kanban },
  { id: "consumer", label: "Consumer Leads", href: "/admin/consumer-leads", group: "Leads", icon: Inbox },
  { id: "recovery", label: "Recovery", href: "/admin/recovery", group: "Leads", icon: LifeBuoy },
  { id: "facility-pipeline", label: "Facility Pipeline", href: "/admin/pipeline", group: "Facilities", icon: Target },
  { id: "portfolio", label: "Portfolio", href: "/admin/portfolio", group: "Facilities", icon: BarChart3 },
  { id: "facilities", label: "Facility Manager", href: "/admin/facilities", group: "Facilities", icon: Building2 },
  { id: "pms-queue", label: "PMS Queue", href: "/admin/pms-queue", group: "Facilities", icon: FileUp },
  { id: "funnels", label: "Funnels", href: "/admin/funnels", group: "Marketing", icon: GitBranch },
  { id: "campaigns", label: "Campaigns", href: "/admin/campaigns", group: "Marketing", icon: Megaphone },
  { id: "creative-library", label: "Creative Library", href: "/admin/style-references", group: "Marketing", icon: Palette },
  { id: "sequences", label: "Sequences", href: "/admin/sequences", group: "Marketing", icon: Mail },
  { id: "insights", label: "Insights", href: "/admin/insights", group: "Marketing", icon: LineChart },
  { id: "billing", label: "Billing", href: "/admin/billing", group: "Revenue", icon: CreditCard },
  { id: "activity", label: "Activity", href: "/admin/activity", group: "Operations", icon: Activity },
  { id: "calls", label: "Calls", href: "/admin/calls", group: "Operations", icon: Phone },
  { id: "diagnostics", label: "Diagnostics", href: "/admin/audits", group: "Operations", icon: ShieldCheck },
  { id: "reports", label: "Reports", href: "/admin/reports", group: "Operations", icon: FileText },
  { id: "partners", label: "Partners", href: "/admin/partners", group: "Operations", icon: Users },
  { id: "setup", label: "Setup", href: "/admin/onboarding", group: "System", icon: Sparkles },
  { id: "settings", label: "Settings", href: "/admin/settings", group: "System", icon: Settings },
  { id: "changelog", label: "Changelog", href: "/admin/changelog", group: "System", icon: BookOpen },
  // Scope-aware facility tool routes (Phase 3, rendered via FacilityToolPage).
  { id: "studio-creative", label: "Creative Studio", href: "/admin/studio/creative", group: "Studio", icon: Palette },
  { id: "studio-ad-generator", label: "Ad Generator", href: "/admin/studio/ad-generator", group: "Studio", icon: Sparkles },
  { id: "studio-publisher", label: "Publisher", href: "/admin/studio/publisher", group: "Studio", icon: Send },
];

const ACTIONS: Destination[] = [
  { id: "act-new-campaign", label: "New campaign", href: "/admin/campaigns/create", group: "Action", icon: Plus },
  { id: "act-upload-pms", label: "Upload PMS report", href: "/admin/pms-queue", group: "Action", icon: Upload },
  { id: "act-generate-audit", label: "Generate diagnostic", href: "/admin/audits", group: "Action", icon: Sparkles },
];

type Item =
  | { kind: "tool" | "action"; id: string; label: string; sub: string; href: string; icon: LucideIcon }
  | { kind: "facility"; id: string; label: string; sub?: string; facId: string };

function matches(q: string, label: string, sub?: string) {
  if (!q) return true;
  return label.toLowerCase().includes(q) || (sub || "").toLowerCase().includes(q);
}

/**
 * Global ⌘K command palette for the admin. Built on the existing
 * useCommandPalette hook (⌘K / "/" / Esc). Indexes admin routes, facilities
 * (re-scopes via FacilityProvider), and a few actions. Navigation only — no
 * tool internals touched.
 */
export function CommandPalette() {
  const { open, close, openPalette } = useCommandPalette();
  const router = useRouter();
  const { facilities, setFacility } = useFacility();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
      if (Array.isArray(raw)) setRecentIds(raw.filter((x) => typeof x === "string"));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lets other chrome (sidebar Quick find, header search) open the palette
  // without sharing the hook instance.
  useEffect(() => {
    function onOpen() {
      openPalette();
    }
    window.addEventListener("admin:open-palette", onOpen);
    return () => window.removeEventListener("admin:open-palette", onOpen);
  }, [openPalette]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const toolItems = useMemo<Item[]>(
    () => DESTINATIONS.map((d) => ({ kind: "tool", id: d.id, label: d.label, sub: d.group, href: d.href, icon: d.icon })),
    [],
  );
  const actionItems = useMemo<Item[]>(
    () => ACTIONS.map((d) => ({ kind: "action", id: d.id, label: d.label, sub: "Action", href: d.href, icon: d.icon })),
    [],
  );
  const facilityItems = useMemo<Item[]>(
    () => facilities.map((f) => ({ kind: "facility", id: `fac:${f.id}`, label: f.name, sub: f.location, facId: f.id })),
    [facilities],
  );

  const byId = useMemo(() => {
    const m = new Map<string, Item>();
    [...toolItems, ...actionItems, ...facilityItems].forEach((i) => m.set(i.id, i));
    return m;
  }, [toolItems, actionItems, facilityItems]);

  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const out: { title: string; items: Item[] }[] = [];
    if (!q) {
      const recents = recentIds.map((id) => byId.get(id)).filter((x): x is Item => Boolean(x)).slice(0, 5);
      if (recents.length) out.push({ title: "Recent", items: recents });
    }
    const tools = toolItems.filter((i) => matches(q, i.label, "sub" in i ? i.sub : ""));
    const facs = facilityItems.filter((i) => matches(q, i.label, i.sub)).slice(0, q ? 25 : 6);
    const acts = actionItems.filter((i) => matches(q, i.label, "sub" in i ? i.sub : ""));
    if (tools.length) out.push({ title: "Go to", items: tools });
    if (facs.length) out.push({ title: "Facilities", items: facs });
    if (acts.length) out.push({ title: "Actions", items: acts });
    return out;
  }, [q, recentIds, byId, toolItems, facilityItems, actionItems]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (cursor > flat.length - 1) setCursor(Math.max(0, flat.length - 1));
  }, [flat.length, cursor]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor, flat.length]);

  function select(item: Item) {
    const next = [item.id, ...recentIds.filter((x) => x !== item.id)].slice(0, 8);
    setRecentIds(next);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    if (item.kind === "facility") {
      setFacility(item.facId);
    } else {
      router.push(item.href);
    }
    close();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = flat[cursor];
      if (it) select(it);
    }
  }

  if (!open) return null;

  const tag = (kind: Item["kind"]) =>
    kind === "facility" ? "Facility" : kind === "action" ? "Action" : "Tool";

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center"
      style={{ background: "rgba(20,18,16,.30)", alignItems: "flex-start" }}
      onClick={close}
      role="presentation"
    >
      <div
        className="mt-[12vh] w-[92%] max-w-[520px] overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--bdr-strong)", borderRadius: "13px" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 px-4" style={{ borderBottom: "1px solid var(--bdr)", height: "48px" }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: "var(--ink3)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search tools, facilities, and actions"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: FONT,
              fontSize: "15px",
              color: "var(--ink)",
            }}
          />
          <span style={kbdStyle}>esc</span>
        </div>

        <div ref={listRef} className="overflow-y-auto p-1.5" style={{ maxHeight: "min(56vh, 384px)" }}>
          {flat.length === 0 ? (
            <div style={{ padding: "34px 0", textAlign: "center", color: "var(--ink3)", fontFamily: FONT, fontSize: "13px" }}>
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.title}>
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                    color: "var(--ink3)",
                    fontWeight: 700,
                    padding: "9px 11px 4px",
                    fontFamily: FONT,
                  }}
                >
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const idx = flat.indexOf(item);
                  const active = idx === cursor;
                  const Icon = "icon" in item ? item.icon : item.kind === "facility" ? Building2 : LayoutGrid;
                  const sub = "sub" in item ? item.sub : undefined;
                  return (
                    <button
                      key={item.id}
                      data-active={active}
                      type="button"
                      onMouseMove={() => setCursor(idx)}
                      onClick={() => select(item)}
                      className="flex w-full items-center gap-3 text-left"
                      style={{
                        fontFamily: FONT,
                        padding: "9px 11px",
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                        background: active ? "var(--active-bg)" : "transparent",
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--ink2)" }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate" style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--ink)" }}>
                          {item.label}
                        </span>
                        {sub && (
                          <span className="block truncate" style={{ fontSize: "11px", color: "var(--ink3)" }}>
                            {sub}
                          </span>
                        )}
                      </span>
                      <span style={tagStyle}>{tag(item.kind)}</span>
                      {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink2)" }} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          className="flex items-center gap-4 px-4"
          style={{ borderTop: "1px solid var(--bdr)", height: "34px", fontSize: "11px", color: "var(--ink3)", fontFamily: FONT }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  color: "var(--ink2)",
  border: "1px solid var(--bdr-strong)",
  borderRadius: "4px",
  padding: "1px 5px",
  fontFamily: FONT,
};

const tagStyle: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink3)",
  border: "1px solid var(--bdr)",
  borderRadius: "5px",
  padding: "1px 6px",
  flexShrink: 0,
  fontFamily: FONT,
};
