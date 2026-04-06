"use client";

import { useState } from "react";
import {
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  Rocket,
  Globe,
} from "lucide-react";
import { VariationActions } from "./variation-actions";
import type { AdVariation, LandingPageContent } from "./types";
import { VARIATION_STATUS_COLORS } from "./types";

export function LandingPageCard({
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
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    slug: string;
    url: string;
  } | null>(null);
  const content = v.content_json as LandingPageContent;

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
      if (data.landingPage) setDeployResult(data.landingPage);
    } finally {
      setSaving(false);
      setDeploying(false);
    }
  }

  async function deployToLandingPage() {
    setDeploying(true);
    await patchVariation({ deploy: "landing_page" });
  }

  const sections = content.sections || [];
  const heroConfig = sections.find((s) => s.section_type === "hero")?.config as
    | Record<string, string>
    | undefined;

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold text-[var(--color-dark)]">
            Landing Page Copy
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"}`}
          >
            {v.status}
          </span>
          <span className="text-xs text-[var(--color-mid-gray)]">
            {sections.length} sections
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
        {/* Hero preview */}
        {heroConfig && (
          <div className="rounded-lg p-5 bg-gradient-to-br from-[var(--color-light)] to-[var(--bg-elevated)] text-white">
            {heroConfig.badgeText && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                {heroConfig.badgeText}
              </span>
            )}
            <h3 className="text-lg font-semibold leading-tight mb-2">
              {heroConfig.headline}
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              {heroConfig.subheadline}
            </p>
            {heroConfig.ctaText && (
              <span className="inline-block mt-3 text-xs px-4 py-1.5 bg-emerald-600 rounded-full font-semibold">
                {heroConfig.ctaText}
              </span>
            )}
          </div>
        )}

        {/* SEO meta preview */}
        {content.meta_title && (
          <div className="mt-3 p-3 rounded-lg bg-[var(--color-light)]">
            <p className="text-xs text-green-400">storageads.com/storage/...</p>
            <p className="text-sm font-medium text-[var(--color-gold)]">
              {content.meta_title}
            </p>
            <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">
              {content.meta_description}
            </p>
          </div>
        )}

        {expanded && (
          <div className="mt-4 space-y-3">
            {sections.map((section, i) => {
              const cfg = section.config as Record<string, unknown>;
              return (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                      {section.section_type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-[var(--color-mid-gray)]">
                      #{section.sort_order}
                    </span>
                  </div>
                  {(cfg.headline as string) && (
                    <p className="text-sm font-semibold text-[var(--color-dark)]">
                      {cfg.headline as string}
                    </p>
                  )}
                  {(cfg.subheadline as string) && (
                    <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">
                      {cfg.subheadline as string}
                    </p>
                  )}
                  {Array.isArray(cfg.items) && (
                    <ul className="mt-2 space-y-1">
                      {(
                        cfg.items as {
                          title?: string;
                          text?: string;
                          q?: string;
                        }[]
                      )
                        .slice(0, 3)
                        .map((item, j) => (
                          <li key={j} className="text-xs text-[var(--color-mid-gray)]">
                            {"\u2022"}{" "}
                            {item.title ||
                              item.text ||
                              item.q ||
                              JSON.stringify(item).slice(0, 80)}
                          </li>
                        ))}
                      {(cfg.items as unknown[]).length > 3 && (
                        <li className="text-xs text-[var(--color-mid-gray)]">
                          ...and {(cfg.items as unknown[]).length - 3} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Deploy action */}
        {(v.status === "approved" || v.status === "draft") && !deployResult && (
          <button
            onClick={deployToLandingPage}
            disabled={deploying || saving}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {deploying ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Deploying...
              </>
            ) : (
              <>
                <Rocket size={14} /> Deploy to Landing Page
              </>
            )}
          </button>
        )}

        {deployResult && (
          <div className="mt-3 p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                Deployed! Page live at{" "}
                <code className="text-xs">{deployResult.url}</code>
              </span>
            </div>
          </div>
        )}

        {v.status === "published" && !deployResult && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-mid-gray)]">
            <Check size={12} className="text-emerald-400" /> Published to
            landing page
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
