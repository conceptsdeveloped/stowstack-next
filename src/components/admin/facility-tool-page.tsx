"use client";

import { Fragment, type ReactNode } from "react";
import { Building2 } from "lucide-react";
import { useFacility } from "@/lib/facility-context";
import { useAdmin } from "@/lib/admin-context";

interface ToolProps {
  facilityId: string;
  facilityName: string;
  adminKey: string;
}

/**
 * Wrapper for scope-aware facility tool routes. Reads the active facility from
 * the shared FacilityProvider and the admin key from AdminProvider, then renders
 * the (unchanged) tool with those props. When scope is "all", shows a prompt to
 * pick a facility instead of rendering a facility-coupled tool with no facility.
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
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center text-center"
        style={{ fontFamily: "var(--font)" }}
      >
        <Building2 className="mb-3 h-8 w-8" style={{ color: "var(--ink3)" }} />
        <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)" }}>
          Select a facility
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--ink3)",
            maxWidth: "320px",
            marginTop: "6px",
            lineHeight: 1.5,
          }}
        >
          {title} works on a single facility. Pick one from the facility switcher
          in the top bar.
        </p>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new Event("admin:open-facility-switcher"))
          }
          style={{
            marginTop: "14px",
            fontFamily: "var(--font)",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--ink)",
            background: "var(--card)",
            border: "1px solid var(--bdr-strong)",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Choose a facility
        </button>
      </div>
    );
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
