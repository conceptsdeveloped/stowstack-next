"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronsUpDown, Layers, Search } from "lucide-react";
import { useFacility } from "@/lib/facility-context";
import type { Facility } from "@/types/facility";

const FONT = "var(--font), var(--font-manrope), system-ui, sans-serif";
const RECENTS_KEY = "storageads_facility_recents";

/** Facilities considered "live" get a green status dot; everything else is muted. */
function isLive(status?: string): boolean {
  const s = (status || "").toLowerCase();
  return s === "active" || s === "live" || s === "client" || s === "client_signed";
}

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

interface Option {
  id: string; // facility id, or "all"
  label: string;
  sub?: string;
  portfolio?: boolean;
  live?: boolean;
}

interface Section {
  title?: string;
  opts: Option[];
}

function toOption(f: Facility): Option {
  return { id: f.id, label: f.name, sub: f.location, live: isLive(f.status) };
}

/**
 * Global facility scope switcher for the admin chrome.
 *
 * Reads/writes the shared FacilityProvider (which syncs `?facility=`), so
 * selecting a facility re-scopes every page that consumes useFacility().
 *
 * Two layouts:
 *  - `variant="sidebar"` — the primary scope control, lives at the top of the
 *    admin sidebar. Full-width; collapses to an icon when the sidebar collapses.
 *  - `variant="compact"` — a pill for the mobile header, where the sidebar is
 *    hidden behind a drawer.
 *
 * Recently-used facilities are remembered (localStorage) and surfaced at the top
 * so operators juggling a portfolio can jump between their go-to facilities.
 *
 * Single-facility admins are auto-scoped, so they get a static label (no picker)
 * — they always see which facility they are acting on, with nothing to switch to.
 */
export function FacilitySwitcher({
  variant = "compact",
  collapsed = false,
}: {
  variant?: "sidebar" | "compact";
  collapsed?: boolean;
}) {
  const { current, facilities, setFacility, currentId, isMultiFacility } =
    useFacility();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecents());
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Let other chrome (e.g. the "Choose a facility" empty-state prompt) open the
  // switcher. It is the single facility-scope control in the admin.
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("admin:open-facility-switcher", onOpen);
    return () =>
      window.removeEventListener("admin:open-facility-switcher", onOpen);
  }, []);

  const q = query.trim().toLowerCase();

  // Build the display as sections (Recent / Facilities), with a parallel flat
  // option list driving keyboard navigation — same pattern as the ⌘K palette.
  const sections = useMemo<Section[]>(() => {
    const matches = (f: Facility) =>
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.location || "").toLowerCase().includes(q);
    const showAll = !q || "all facilities portfolio".includes(q);
    const allOpt: Option = {
      id: "all",
      label: "All facilities",
      sub: `${facilities.length} ${facilities.length === 1 ? "facility" : "facilities"}`,
      portfolio: true,
    };

    if (q) {
      const filtered = facilities.filter(matches).map(toOption);
      return [{ opts: showAll ? [allOpt, ...filtered] : filtered }].filter(
        (s) => s.opts.length,
      );
    }

    // No query: pin the portfolio roll-up, then Recent, then the rest.
    const recents = recentIds
      .map((id) => facilities.find((f) => f.id === id))
      .filter((f): f is Facility => Boolean(f))
      .slice(0, 3);
    const recentSet = new Set(recents.map((f) => f.id));
    const rest = facilities.filter((f) => !recentSet.has(f.id));

    if (recents.length) {
      return [
        { opts: [allOpt] },
        { title: "Recent", opts: recents.map(toOption) },
        { title: "Facilities", opts: rest.map(toOption) },
      ].filter((s) => s.opts.length);
    }
    return [{ opts: [allOpt, ...rest.map(toOption)] }];
  }, [facilities, q, recentIds]);

  const flatOptions = useMemo(
    () => sections.flatMap((s) => s.opts),
    [sections],
  );

  // When the menu opens, start the highlight on the current selection.
  useEffect(() => {
    if (!open) return;
    const idx = flatOptions.findIndex((o) => o.id === currentId);
    setHighlight(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlight valid as the filtered list shrinks, and scroll it in view.
  useEffect(() => {
    if (!open) return;
    if (highlight > flatOptions.length - 1)
      setHighlight(Math.max(0, flatOptions.length - 1));
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-opt-index="${highlight}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, flatOptions.length, open]);

  function onTriggerKey(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(flatOptions.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(flatOptions.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = flatOptions[highlight];
      if (opt) select(opt.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  function select(id: string) {
    if (id !== "all") {
      const next = [id, ...recentIds.filter((x) => x !== id)].slice(0, 6);
      setRecentIds(next);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
    setFacility(id === "all" ? "all" : id);
    close();
  }

  if (!facilities.length) return null;

  const label = current === "all" ? "All facilities" : current.name;
  const sidebar = variant === "sidebar";

  // ── Single-facility: static, non-interactive scope indicator ───────────────
  if (!isMultiFacility) {
    if (sidebar && collapsed) {
      return (
        <div className="flex justify-center" title={label}>
          <Building2 className="h-4 w-4" style={{ color: "var(--ink3)" }} />
        </div>
      );
    }
    return (
      <span
        className="flex items-center gap-2"
        style={{
          fontFamily: FONT,
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--ink)",
          background: "var(--card)",
          border: "1px solid var(--bdr-strong)",
          borderRadius: sidebar ? "8px" : "999px",
          padding: sidebar ? "8px 10px" : "5px 10px",
          width: sidebar ? "100%" : undefined,
          maxWidth: sidebar ? undefined : "220px",
        }}
        aria-label={`Active facility: ${label}`}
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink3)" }} />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  const isAll = currentId === "all";

  // ── Collapsed sidebar: icon-only trigger ───────────────────────────────────
  const trigger =
    sidebar && collapsed ? (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className="flex w-full items-center justify-center"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "6px",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Facility scope: ${label}. Switch facility`}
        title={`Scope: ${label}`}
      >
        {isAll ? (
          <Layers className="h-4 w-4" style={{ color: "var(--ink2)" }} />
        ) : (
          <Building2 className="h-4 w-4" style={{ color: "var(--ink2)" }} />
        )}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className="flex items-center gap-2"
        style={{
          fontFamily: FONT,
          fontSize: sidebar ? "13px" : "12px",
          fontWeight: 600,
          color: "var(--ink)",
          background: "var(--card)",
          border: "1px solid var(--bdr-strong)",
          borderRadius: sidebar ? "8px" : "999px",
          padding: sidebar ? "8px 10px" : "5px 10px",
          cursor: "pointer",
          width: sidebar ? "100%" : undefined,
          maxWidth: sidebar ? undefined : "220px",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch facility scope"
      >
        {isAll ? (
          <Layers className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink3)" }} />
        ) : (
          <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink3)" }} />
        )}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronsUpDown className="h-3 w-3 shrink-0" style={{ color: "var(--ink3)" }} />
      </button>
    );

  // Running index across sections so each row's keyboard position is unique.
  let runningIndex = -1;

  return (
    <div ref={ref} className="relative">
      {trigger}

      {open && (
        <div
          className="absolute z-50 mt-1.5 overflow-hidden"
          style={{
            top: "100%",
            left: 0,
            width: sidebar ? "max(100%, 240px)" : "256px",
            background: "var(--card)",
            border: "1px solid var(--bdr-strong)",
            borderRadius: "11px",
            boxShadow: "0 12px 28px -10px rgba(0,0,0,0.22), 0 4px 10px -6px rgba(0,0,0,0.14)",
          }}
        >
          <div
            className="flex items-center gap-2 px-3"
            style={{ borderBottom: "1px solid var(--bdr)", height: "38px" }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink3)" }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onListKey}
              placeholder="Search facilities"
              role="combobox"
              aria-expanded
              aria-controls="facility-switcher-list"
              aria-activedescendant={
                flatOptions[highlight] ? `facility-opt-${highlight}` : undefined
              }
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: FONT,
                fontSize: "13px",
                color: "var(--ink)",
              }}
            />
          </div>
          <div
            ref={listRef}
            id="facility-switcher-list"
            role="listbox"
            aria-label="Facilities"
            className="max-h-72 overflow-y-auto p-1.5"
          >
            {sections.map((section, si) => (
              <div key={section.title ?? `s${si}`}>
                {section.title && (
                  <div
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--ink3)",
                      fontWeight: 700,
                      padding: "7px 9px 3px",
                      fontFamily: FONT,
                    }}
                  >
                    {section.title}
                  </div>
                )}
                {section.opts.map((opt) => {
                  const i = (runningIndex += 1);
                  return (
                    <FacilityRow
                      key={opt.id}
                      index={i}
                      active={currentId === opt.id}
                      highlighted={highlight === i}
                      option={opt}
                      onSelect={() => select(opt.id)}
                      onHover={() => setHighlight(i)}
                    />
                  );
                })}
              </div>
            ))}
            {flatOptions.length === 0 && (
              <div
                style={{
                  padding: "12px",
                  textAlign: "center",
                  color: "var(--ink3)",
                  fontSize: "12px",
                  fontFamily: FONT,
                }}
              >
                No facility found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FacilityRow({
  index,
  active,
  highlighted,
  option,
  onSelect,
  onHover,
}: {
  index: number;
  active: boolean;
  highlighted: boolean;
  option: Option;
  onSelect: () => void;
  onHover: () => void;
}) {
  const Icon = option.portfolio ? Layers : Building2;
  return (
    <button
      type="button"
      id={`facility-opt-${index}`}
      data-opt-index={index}
      role="option"
      aria-selected={active}
      onClick={onSelect}
      onMouseMove={onHover}
      className="flex w-full items-center gap-2.5 text-left"
      style={{
        fontFamily: FONT,
        padding: "7px 9px",
        borderRadius: "7px",
        background: active
          ? "var(--active-bg)"
          : highlighted
            ? "var(--hover-bg)"
            : "transparent",
        border: "none",
        cursor: "pointer",
      }}
    >
      {option.portfolio ? (
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink3)" }} />
      ) : (
        <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          <Icon className="h-3.5 w-3.5" style={{ color: "var(--ink3)" }} />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full"
            style={{
              background: option.live ? "var(--color-green)" : "var(--ink3)",
              border: "1px solid var(--card)",
            }}
            aria-hidden
          />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className="block truncate"
          style={{
            fontSize: "13px",
            fontWeight: active ? 600 : 500,
            color: "var(--ink)",
          }}
        >
          {option.label}
        </span>
        {option.sub && (
          <span
            className="block truncate"
            style={{ fontSize: "11px", color: "var(--ink3)" }}
          >
            {option.sub}
          </span>
        )}
      </span>
      {active && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink)" }} />}
    </button>
  );
}
