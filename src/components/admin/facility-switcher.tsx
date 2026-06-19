"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronsUpDown, Layers, Search } from "lucide-react";
import { useFacility } from "@/lib/facility-context";

const FONT = "var(--font), var(--font-manrope), system-ui, sans-serif";

/**
 * Global facility scope switcher for the admin chrome.
 * Reads/writes the shared FacilityProvider (which syncs `?facility=`),
 * so selecting a facility re-scopes every page that consumes useFacility().
 * Hidden for single-facility users (they are auto-scoped).
 */
export function FacilitySwitcher() {
  const { current, facilities, setFacility, currentId, isMultiFacility } =
    useFacility();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isMultiFacility) return null;

  const label = current === "all" ? "All facilities" : current.name;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? facilities.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.location || "").toLowerCase().includes(q),
      )
    : facilities;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2"
        style={{
          fontFamily: FONT,
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--ink)",
          background: "var(--card)",
          border: "1px solid var(--bdr-strong)",
          borderRadius: "999px",
          padding: "5px 10px",
          cursor: "pointer",
          maxWidth: "220px",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch facility scope"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink3)" }} />
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="h-3 w-3 shrink-0" style={{ color: "var(--ink3)" }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Facilities"
          className="absolute left-0 z-50 mt-1.5 w-64 overflow-hidden"
          style={{
            background: "var(--card)",
            border: "1px solid var(--bdr-strong)",
            borderRadius: "11px",
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Switch facility"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: FONT,
                fontSize: "13px",
                color: "var(--ink)",
              }}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            <FacilityRow
              active={currentId === "all"}
              label="All facilities"
              sub="Portfolio roll-up"
              portfolio
              onSelect={() => {
                setFacility("all");
                setOpen(false);
              }}
            />
            {filtered.map((f) => (
              <FacilityRow
                key={f.id}
                active={currentId === f.id}
                label={f.name}
                sub={f.location}
                onSelect={() => {
                  setFacility(f.id);
                  setOpen(false);
                }}
              />
            ))}
            {filtered.length === 0 && (
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
  active,
  label,
  sub,
  portfolio,
  onSelect,
}: {
  active: boolean;
  label: string;
  sub?: string;
  portfolio?: boolean;
  onSelect: () => void;
}) {
  const Icon = portfolio ? Layers : Building2;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 text-left"
      style={{
        fontFamily: FONT,
        padding: "7px 9px",
        borderRadius: "7px",
        background: active ? "var(--active-bg)" : "transparent",
        border: "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--hover-bg)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink3)" }} />
      <span className="min-w-0 flex-1">
        <span
          className="block truncate"
          style={{
            fontSize: "13px",
            fontWeight: active ? 600 : 500,
            color: "var(--ink)",
          }}
        >
          {label}
        </span>
        {sub && (
          <span
            className="block truncate"
            style={{ fontSize: "11px", color: "var(--ink3)" }}
          >
            {sub}
          </span>
        )}
      </span>
      {active && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink)" }} />}
    </button>
  );
}
