"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { Stamp } from "@/components/instrument-calm/stamp";
import { TYPE_DEFS } from "@/lib/ontology/registry";
import type { OntologyObject } from "@/lib/ontology/types";
import { indexHref } from "./use-ontology";

/**
 * Tools in focus: when a tool is opened from an object (?focus=units/10x10),
 * the object rides along. The panel shows what you came to work on, in the
 * "Looking at" grammar of the Instrument Calm inspector (library entry 008).
 * It carries no buttons: the tool beneath it owns the view's actions. The
 * context lets any tool read the object, so it starts from what the system
 * already knows. Tools outside the provider get null and behave as before.
 */

const ToolFocusCtx = createContext<OntologyObject | null>(null);

export function ToolFocusProvider({ object, children }: { object: OntologyObject | null; children: ReactNode }) {
  return <ToolFocusCtx.Provider value={object}>{children}</ToolFocusCtx.Provider>;
}

/** The object this tool was opened for, or null. */
export function useToolFocus(): OntologyObject | null {
  return useContext(ToolFocusCtx);
}

export function FocusBar({ object, onClear, showIndexLink = true }: { object: OntologyObject; onClear: () => void; showIndexLink?: boolean }) {
  const [copied, setCopied] = useState(false);
  const def = TYPE_DEFS[object.type];
  return (
    <div
      className="mb-5 border border-[var(--ic-line-instrument)] bg-[var(--ic-ground-white)] p-4 text-[var(--ic-ink-primary)] sm:p-5"
      role="region"
      aria-label={`Looking at ${object.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="ic-label">Looking at · {def.singular}</div>
        <button type="button" onClick={onClear} className="ic-label underline underline-offset-4">
          Close
        </button>
      </div>
      <div className="mt-1 border-b border-[var(--ic-line-quiet)] pb-3 text-[24px] font-extrabold leading-tight tracking-[-0.015em]">
        {object.name}
      </div>
      <div className="mt-3 flex items-start gap-3">
        <Stamp name={def.stamp} size={48} framed />
        <div className="min-w-0">
          <div className="text-[16px] font-bold leading-snug">{object.brief}</div>
          <div className="ic-label mt-1 normal-case tracking-[0.02em]">{object.address}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          className="text-[15px] font-extrabold underline underline-offset-4"
          onClick={() => {
            navigator.clipboard?.writeText(object.brief).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
        >
          {copied ? "Copied" : "Copy the facts"}
        </button>
        {showIndexLink && (
          <Link href={indexHref(object.address)} className="text-[15px] font-extrabold">
            See everything it touches <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <div className="ic-label mt-3">Opened from the index. Nothing changes until you save in the tool.</div>
    </div>
  );
}
