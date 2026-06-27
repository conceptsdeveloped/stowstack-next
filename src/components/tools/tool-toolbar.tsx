"use client";

import { useState } from "react";
import { Download, Share2, Check, RotateCcw } from "lucide-react";
import { buildShareUrl, type ParamValue } from "@/lib/tools/share";
import { rowsToCsv, type CsvRow } from "@/lib/tools/csv";

/* ──────────────────────────────────────────────────────────────────────────
   Shared toolbar primitives for the operator tools at /tools.

   ToolbarButton: the bordered icon button used across the suite.
   ShareButton:   copies a link that reopens the tool with the current inputs.
   CsvButton:     serializes the given rows and triggers a client-side download.

   Both action buttons are pure presentation over the pure helpers in
   @/lib/tools/{share,csv}; the only impure bits (clipboard, Blob/anchor) live
   here so the math + serialization stay unit-tested.
   ────────────────────────────────────────────────────────────────────────── */

export function ToolbarButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={{
        border: "1px solid var(--color-light-gray)",
        color: "var(--color-body-text)",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

/** Copy-a-link button. Builds the URL from the current tool inputs on click. */
export function ShareButton({
  params,
  label = "Share",
}: {
  params: Record<string, ParamValue | undefined>;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    if (typeof window === "undefined") return;
    const url = buildShareUrl(
      window.location.origin,
      window.location.pathname,
      params,
    );
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked — fail quietly */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolbarButton
      onClick={onClick}
      icon={
        copied ? (
          <Check className="h-4 w-4" style={{ color: "var(--color-green)" }} />
        ) : (
          <Share2 className="h-4 w-4" />
        )
      }
    >
      {copied ? "Link copied" : label}
    </ToolbarButton>
  );
}

/** Download-CSV button. `rows` is rebuilt by the caller from current state. */
export function CsvButton({
  rows,
  filename,
  label = "CSV",
}: {
  rows: CsvRow[];
  filename: string;
  label?: string;
}) {
  const onClick = () => {
    if (typeof document === "undefined") return;
    const csv = rowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ToolbarButton onClick={onClick} icon={<Download className="h-4 w-4" />}>
      {label}
    </ToolbarButton>
  );
}

/**
 * Reset button. Runs the caller's `onReset` (which restores the tool's inputs
 * to their defaults) and strips any query string so a shared link doesn't
 * leave stale params in the address bar after a clear.
 */
export function ResetButton({
  onReset,
  label = "Reset",
}: {
  onReset: () => void;
  label?: string;
}) {
  const onClick = () => {
    onReset();
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  return (
    <ToolbarButton onClick={onClick} icon={<RotateCcw className="h-4 w-4" />}>
      {label}
    </ToolbarButton>
  );
}
