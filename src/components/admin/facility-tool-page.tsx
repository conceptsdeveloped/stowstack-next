"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Building2, Search } from "lucide-react";
import { useFacility } from "@/lib/facility-context";
import { useAdmin } from "@/lib/admin-context";
import { pushFacilityRecent, readFacilityRecents } from "@/lib/facility-recents";
import type { Facility } from "@/types/facility";

interface ToolProps {
  facilityId: string;
  facilityName: string;
  adminKey: string;
}

const FONT = "var(--font), var(--font-manrope), system-ui, sans-serif";

function isLive(status?: string): boolean {
  const s = (status || "").toLowerCase();
  return s === "active" || s === "live" || s === "client" || s === "client_signed";
}

/**
 * Inline facility chooser shown when a scope-aware tool is opened at "all"
 * scope. Selecting a facility here scopes the whole admin (via setFacility) and
 * the tool renders immediately — no detour to the sidebar switcher.
 */
function FacilityPicker({ title }: { title: string }) {
  const { facilities, setFacility } = useFacility();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const { recent, rest } = useMemo(() => {
    const matches = (f: Facility) =>
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.location || "").toLowerCase().includes(q);
    const filtered = facilities.filter(matches);
    const recentIds = readFacilityRecents();
    const recentSet = new Set(recentIds);
    const recent = recentIds
      .map((id) => filtered.find((f) => f.id === id))
      .filter((f): f is Facility => Boolean(f))
      .slice(0, 4);
    return { recent, rest: filtered.filter((f) => !recentSet.has(f.id)) };
  }, [facilities, q]);

  function choose(id: string) {
    pushFacilityRecent(id);
    setFacility(id);
  }

  const showSearch = facilities.length > 6;

  return (
    <div
      className="mx-auto flex min-h-[60vh] w-full max-w-[440px] flex-col justify-center"
      style={{ fontFamily: FONT }}
    >
      <div className="mb-5 text-center">
        <Building2 className="mx-auto mb-3 h-8 w-8" style={{ color: "var(--ink3)" }} />
        <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)" }}>
          Select a facility
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--ink3)",
            marginTop: "6px",
            lineHeight: 1.5,
          }}
        >
          {title} works on a single facility. Pick one to continue.
        </p>
      </div>

      {showSearch && (
        <div
          className="mb-2 flex items-center gap-2 px-3"
          style={{
            border: "1px solid var(--bdr-strong)",
            borderRadius: "9px",
            height: "38px",
            background: "var(--card)",
          }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink3)" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search facilities"
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
      )}

      <div className="max-h-[46vh] overflow-y-auto">
        {recent.length > 0 && (
          <Section title="Recent" facilities={recent} onChoose={choose} />
        )}
        <Section
          title={recent.length > 0 ? "All facilities" : undefined}
          facilities={rest}
          onChoose={choose}
        />
        {recent.length === 0 && rest.length === 0 && (
          <p
            className="py-6 text-center"
            style={{ fontSize: "13px", color: "var(--ink3)" }}
          >
            {q ? (
              <>No facility matches &ldquo;{query}&rdquo;.</>
            ) : (
              "No facilities yet."
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  facilities,
  onChoose,
}: {
  title?: string;
  facilities: Facility[];
  onChoose: (id: string) => void;
}) {
  if (!facilities.length) return null;
  return (
    <div className="mb-1.5">
      {title && (
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            fontWeight: 700,
            padding: "8px 4px 4px",
          }}
        >
          {title}
        </div>
      )}
      <div className="space-y-1">
        {facilities.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChoose(f.id)}
            className="flex w-full items-center gap-3 text-left"
            style={{
              padding: "9px 11px",
              borderRadius: "9px",
              border: "1px solid var(--bdr)",
              background: "var(--card)",
              cursor: "pointer",
            }}
          >
            <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
              <Building2 className="h-4 w-4" style={{ color: "var(--ink3)" }} />
              <span
                className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full"
                style={{
                  background: isLive(f.status) ? "var(--color-green)" : "var(--ink3)",
                  border: "1px solid var(--card)",
                }}
                aria-hidden
              />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate"
                style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--ink)" }}
              >
                {f.name}
              </span>
              {f.location && (
                <span
                  className="block truncate"
                  style={{ fontSize: "11px", color: "var(--ink3)" }}
                >
                  {f.location}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Wrapper for scope-aware facility tool routes. Reads the active facility from
 * the shared FacilityProvider and the admin key from AdminProvider, then renders
 * the (unchanged) tool with those props. When scope is "all", shows an inline
 * facility picker instead of rendering a facility-coupled tool with no facility.
 */
export function FacilityToolPage({
  title,
  render,
}: {
  title: string;
  render: (props: ToolProps) => ReactNode;
}) {
  const { current, currentId } = useFacility();
  const { adminKey } = useAdmin();

  if (currentId === "all" || current === "all") {
    return <FacilityPicker title={title} />;
  }

  // Key on the facility id so switching scope remounts the tool — no stale data
  // from the previously selected facility bleeds through.
  return (
    <Fragment key={currentId}>
      {render({
        facilityId: currentId,
        facilityName: current.name,
        adminKey: adminKey ?? "",
      })}
    </Fragment>
  );
}
