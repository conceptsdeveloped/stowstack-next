"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CornerDownLeft,
  GitBranch,
  Layers,
  Phone,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useFacility } from "@/lib/facility-context";
import { NAV_GROUPS } from "@/lib/admin-nav";
import { readFacilityRecents } from "@/lib/facility-recents";

const FONT = "var(--font), var(--font-manrope), system-ui, sans-serif";
const RECENTS_KEY = "storageads_palette_recents";

interface Destination {
  id: string;
  label: string;
  href: string;
  group: string;
  icon: LucideIcon;
  scoped?: boolean;
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// Palette-only routes: the portfolio ("all facilities") variants of tools the
// sidebar only lists scoped. Everything else is derived from the spine below.
const PALETTE_EXTRAS: Destination[] = [
  { id: "/admin/funnels", label: "Funnels (all facilities)", href: "/admin/funnels", group: "Channels", icon: GitBranch },
  { id: "/admin/calls", label: "Calls (all facilities)", href: "/admin/calls", group: "Facilities", icon: Phone },
];

// Route truth comes from the shared admin spine (admin-nav), so the palette can
// never drift from the sidebar — new tools appear in both automatically.
const DESTINATIONS: Destination[] = [
  ...NAV_GROUPS.flatMap((g) =>
    g.items.map((item) => ({
      id: item.href,
      label: item.label,
      href: item.href,
      group: titleCase(g.title),
      icon: item.icon,
      scoped: item.scoped,
    })),
  ),
  ...PALETTE_EXTRAS,
];

const ACTIONS: Destination[] = [
  { id: "act-new-campaign", label: "New campaign", href: "/admin/campaigns/create", group: "Action", icon: Plus },
  { id: "act-upload-pms", label: "Upload PMS report", href: "/admin/pms-queue", group: "Action", icon: Upload },
  { id: "act-generate-audit", label: "Generate diagnostic", href: "/admin/audits", group: "Action", icon: Sparkles },
];

type Item = {
  kind: "tool" | "action" | "facility";
  id: string;
  label: string;
  sub: string;
  href: string;
  icon: LucideIcon;
  scoped?: boolean; // tool operates on a single facility (tagged "Facility")
  facilityId?: string; // for kind "facility": the id to scope to, or "all"
};

function matches(q: string, label: string, sub?: string) {
  if (!q) return true;
  return label.toLowerCase().includes(q) || (sub || "").toLowerCase().includes(q);
}

/**
 * Global ⌘K command palette for the admin. Built on the existing
 * useCommandPalette hook (⌘K / "/" / Esc). Its route list is derived from the
 * shared admin spine (admin-nav) so it never drifts from the sidebar. It also
 * switches facility scope: recently-used facilities surface in the default view
 * for one-keystroke switching, and typing matches the full facility list. The
 * FacilitySwitcher in the sidebar remains the primary scope control; the palette
 * is just a fast keyboard path to it. Switching scope only rewrites the
 * `?facility=` param via setFacility (no API call, so no CSRF concern).
 */
export function CommandPalette() {
  const { open, close, openPalette } = useCommandPalette();
  const router = useRouter();
  const { facilities, setFacility, currentId } = useFacility();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  });
  const [facRecents, setFacRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset query/cursor + refresh facility recents when the palette opens
      setQuery("");
      setCursor(0);
      setFacRecents(readFacilityRecents());
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
    () => DESTINATIONS.map((d) => ({ kind: "tool", id: d.id, label: d.label, sub: d.group, href: d.href, icon: d.icon, scoped: d.scoped })),
    [],
  );
  const actionItems = useMemo<Item[]>(
    () => ACTIONS.map((d) => ({ kind: "action", id: d.id, label: d.label, sub: "Action", href: d.href, icon: d.icon })),
    [],
  );
  const facilityItems = useMemo<Item[]>(() => {
    if (facilities.length < 2) return [];
    const all: Item = {
      kind: "facility",
      id: "fac-scope-all",
      label: "All facilities",
      sub: currentId === "all" ? "Current scope" : "Portfolio roll-up",
      href: "",
      icon: Layers,
      facilityId: "all",
    };
    return [
      all,
      ...facilities.map<Item>((f) => ({
        kind: "facility",
        id: `fac-scope-${f.id}`,
        label: f.name,
        sub: f.id === currentId ? "Current scope" : f.location || "Switch scope",
        href: "",
        icon: Building2,
        facilityId: f.id,
      })),
    ];
  }, [facilities, currentId]);
  const byId = useMemo(() => {
    const m = new Map<string, Item>();
    [...toolItems, ...actionItems].forEach((i) => m.set(i.id, i));
    return m;
  }, [toolItems, actionItems]);

  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const out: { title: string; items: Item[] }[] = [];
    if (!q) {
      const recents = recentIds.map((id) => byId.get(id)).filter((x): x is Item => Boolean(x)).slice(0, 5);
      if (recents.length) out.push({ title: "Recent", items: recents });
    }
    // When typing, match the whole facility list by name. With no query, offer a
    // quick-switch shortlist (jump to the portfolio + recently-used facilities)
    // so you can change scope without typing — the full browse is still the
    // sidebar switcher's job.
    let facs: Item[];
    if (q) {
      facs = facilityItems.filter((i) => matches(q, i.label, i.sub));
    } else {
      const byFacilityId = new Map(facilityItems.map((i) => [i.facilityId, i]));
      const allItem = currentId !== "all" ? byFacilityId.get("all") : undefined;
      const recentFacs = facRecents
        .map((id) => byFacilityId.get(id))
        .filter((x): x is Item => Boolean(x) && x!.facilityId !== currentId)
        .slice(0, 3);
      facs = [...(allItem ? [allItem] : []), ...recentFacs];
    }
    const tools = toolItems.filter((i) => matches(q, i.label, i.sub));
    const acts = actionItems.filter((i) => matches(q, i.label, i.sub));
    if (facs.length) out.push({ title: "Switch facility", items: facs });
    if (tools.length) out.push({ title: "Go to", items: tools });
    if (acts.length) out.push({ title: "Actions", items: acts });
    return out;
  }, [q, recentIds, byId, toolItems, actionItems, facilityItems, facRecents, currentId]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeIndex = flat.length ? Math.min(Math.max(cursor, 0), flat.length - 1) : 0;

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flat.length]);

  function select(item: Item) {
    if (item.kind === "facility") {
      setFacility(item.facilityId === "all" ? "all" : item.facilityId!);
      close();
      return;
    }
    const next = [item.id, ...recentIds.filter((x) => x !== item.id)].slice(0, 8);
    setRecentIds(next);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    router.push(item.href);
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
      const it = flat[activeIndex];
      if (it) select(it);
    }
  }

  if (!open) return null;

  const tag = (item: Item) =>
    item.kind === "action"
      ? "Action"
      : item.kind === "facility"
        ? "Scope"
        : item.scoped
          ? "Facility"
          : "Tool";

  // Pair each row with its absolute position in `flat` so the active-row
  // highlight stays correct even when an item appears in two groups (Recent + its category).
  let flatIdx = -1;
  const indexedGroups = groups.map((group) => ({
    title: group.title,
    items: group.items.map((item) => ({ item, index: (flatIdx += 1) })),
  }));

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
            placeholder="Search tools and actions"
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
            indexedGroups.map((group) => (
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
                {group.items.map(({ item, index }) => {
                  const active = index === activeIndex;
                  const Icon = item.icon;
                  const sub = item.sub;
                  return (
                    <button
                      key={item.id}
                      data-active={active}
                      type="button"
                      onMouseMove={() => setCursor(index)}
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
                      <span style={tagStyle}>{tag(item)}</span>
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
