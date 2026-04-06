"use client";

import { useState } from "react";
import {
  Loader2,
  Mail,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
} from "lucide-react";
import { VariationActions } from "./variation-actions";
import type { AdVariation, EmailDripContent } from "./types";
import { VARIATION_STATUS_COLORS } from "./types";

export function EmailDripCard({
  v,
  adminKey,
  onUpdate,
  onDelete,
}: {
  v: AdVariation;
  adminKey: string;
  onUpdate: (updated: AdVariation) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedEmail, setExpandedEmail] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [dripActivated, setDripActivated] = useState(false);
  const content = v.content_json as EmailDripContent;

  async function patchVariation(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/facility-creatives", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({ variationId: v.id, ...body }),
      });
      const data = await res.json();
      if (data.variation) onUpdate(data.variation);
      if (data.dripActivated) setDripActivated(true);
    } finally {
      setSaving(false);
      setDeploying(false);
    }
  }

  async function activateDrip() {
    setDeploying(true);
    await patchVariation({ deploy: "email_drip" });
  }

  const sequence = content.sequence || [];

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-[var(--color-dark)]">
            Email Drip Sequence
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"}`}
          >
            {v.status}
          </span>
          <span className="text-xs text-[var(--color-mid-gray)]">
            {sequence.length} emails
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] px-4 py-4 space-y-2">
        {sequence.map((email, i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
          >
            <button
              onClick={() =>
                setExpandedEmail(expandedEmail === i ? null : i)
              }
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-light-gray)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                  Day {email.delayDays}
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    {email.subject}
                  </p>
                  <p className="text-xs text-[var(--color-mid-gray)]">{email.label}</p>
                </div>
              </div>
              {expandedEmail === i ? (
                <ChevronUp size={14} className="text-[var(--color-mid-gray)]" />
              ) : (
                <ChevronDown size={14} className="text-[var(--color-mid-gray)]" />
              )}
            </button>

            {expandedEmail === i && (
              <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
                {email.preheader && (
                  <p className="text-xs text-[var(--color-mid-gray)] mt-3 mb-2 italic">
                    Preheader: {email.preheader}
                  </p>
                )}
                <div className="text-sm text-[var(--color-dark)] leading-relaxed whitespace-pre-line mt-2">
                  {email.body}
                </div>
                {email.ctaText && (
                  <span className="inline-block mt-3 text-xs px-4 py-1.5 bg-emerald-600 text-white rounded font-semibold">
                    {email.ctaText}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Deploy action */}
        {(v.status === "approved" || v.status === "draft") &&
          !dripActivated && (
            <button
              onClick={activateDrip}
              disabled={deploying || saving}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-40 transition-colors"
            >
              {deploying ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Activating...
                </>
              ) : (
                <>
                  <Zap size={14} /> Activate Drip Sequence
                </>
              )}
            </button>
          )}

        {dripActivated && (
          <div className="mt-3 p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                Drip sequence activated and ready for enrollment
              </span>
            </div>
          </div>
        )}

        {v.status === "published" && !dripActivated && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-mid-gray)]">
            <Check size={12} className="text-emerald-400" /> Drip sequence
            activated
          </div>
        )}

        <VariationActions
          v={v}
          saving={saving}
          onApprove={() => patchVariation({ status: "approved" })}
          onReject={() => patchVariation({ status: "rejected" })}
          onUnapprove={() => patchVariation({ status: "draft" })}
          onDelete={() => onDelete(v.id)}
          rejecting={false}
        />
      </div>
    </div>
  );
}
