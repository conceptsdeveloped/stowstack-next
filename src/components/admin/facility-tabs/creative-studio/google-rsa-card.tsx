"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { VariationActions } from "./variation-actions";
import type { AdVariation, GoogleRSAContent } from "./types";
import { VARIATION_STATUS_COLORS } from "./types";

export function GoogleRSACard({
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
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const content = v.content_json as GoogleRSAContent;

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
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  const headlines = content.headlines || [];
  const descriptions = content.descriptions || [];
  const sitelinks = content.sitelinks || [];

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-[var(--color-gold)]" />
          <span className="text-sm font-semibold text-[var(--color-dark)]">
            Google Responsive Search Ad
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"}`}
          >
            {v.status}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] flex items-center gap-1 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} /> Collapse
            </>
          ) : (
            <>
              <ChevronDown size={12} /> Expand
            </>
          )}
        </button>
      </div>

      <div className="border-t border-[var(--border-subtle)] px-4 py-4">
        {/* Google Search Preview */}
        <div className="rounded-lg p-4 bg-[var(--color-light)]">
          <p className="text-xs text-green-400 mb-0.5">
            Ad · storageads.com{content.finalUrl || "/"}
          </p>
          <p className="text-base font-medium text-[var(--color-gold)] leading-snug">
            {headlines
              .slice(0, 3)
              .map((h) => h.text)
              .join(" | ")}
          </p>
          <p className="text-sm text-[var(--color-body-text)] mt-1 leading-relaxed">
            {descriptions[0]?.text || ""}
          </p>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Headlines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
                  Headlines ({headlines.length}/15)
                </p>
                <button
                  onClick={() =>
                    copyToClipboard(
                      headlines.map((h) => h.text).join("\n"),
                      "headlines"
                    )
                  }
                  className="text-xs flex items-center gap-1 text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                >
                  {copied === "headlines" ? (
                    <>
                      <Check size={10} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={10} /> Copy all
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {headlines.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-1.5 rounded text-sm bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
                  >
                    <span className="text-[var(--color-dark)]">{h.text}</span>
                    <span
                      className={`text-[10px] ${h.text.length > 30 ? "text-red-400" : "text-[var(--color-mid-gray)]"}`}
                    >
                      {h.text.length}/30
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Descriptions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
                  Descriptions ({descriptions.length}/4)
                </p>
                <button
                  onClick={() =>
                    copyToClipboard(
                      descriptions.map((d) => d.text).join("\n"),
                      "descriptions"
                    )
                  }
                  className="text-xs flex items-center gap-1 text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                >
                  {copied === "descriptions" ? (
                    <>
                      <Check size={10} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={10} /> Copy all
                    </>
                  )}
                </button>
              </div>
              {descriptions.map((d, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded text-sm mb-1 bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
                >
                  <span className="text-[var(--color-dark)]">{d.text}</span>
                  <span
                    className={`text-[10px] ml-2 ${d.text.length > 90 ? "text-red-400" : "text-[var(--color-mid-gray)]"}`}
                  >
                    {d.text.length}/90
                  </span>
                </div>
              ))}
            </div>

            {/* Sitelinks */}
            {sitelinks.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)] mb-2">
                  Sitelink Extensions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sitelinks.map((s, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
                    >
                      <p className="text-sm font-medium text-[var(--color-gold)]">
                        {s.title}
                      </p>
                      <p className="text-xs text-[var(--color-mid-gray)]">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {content.keywords?.length ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)] mb-2">
                  Suggested Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {content.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
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
