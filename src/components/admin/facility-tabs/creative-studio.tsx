"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Sparkles,
  Search,
  FileText,
  Mail,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Rocket,
  Globe,
  Zap,
  Trash2,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────── */

interface MetaAdContent {
  angle: string;
  angleLabel: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  targetingNote: string;
}

interface GoogleRSAContent {
  name: string;
  headlines: { text: string; pin_position?: number | null }[];
  descriptions: { text: string }[];
  finalUrl: string;
  sitelinks: { title: string; description: string }[];
  keywords?: string[];
}

interface LandingPageContent {
  sections: {
    section_type: string;
    sort_order: number;
    config: Record<string, unknown>;
  }[];
  meta_title: string;
  meta_description: string;
}

interface EmailDripContent {
  sequence: {
    step: number;
    delayDays: number;
    subject: string;
    preheader: string;
    body: string;
    ctaText: string;
    ctaUrl: string;
    label: string;
  }[];
}

interface AdVariation {
  id: string;
  facility_id: string;
  brief_id: string | null;
  created_at: string;
  platform: string;
  format: string;
  angle: string;
  content_json:
    | MetaAdContent
    | GoogleRSAContent
    | LandingPageContent
    | EmailDripContent
    | Record<string, unknown>;
  asset_urls: Record<string, string> | null;
  status: string;
  feedback: string | null;
  version: number;
  compliance_status: string | null;
  compliance_flags: ComplianceFlag[] | null;
}

interface ComplianceFlag {
  severity: "warning" | "violation";
  rule: string;
  detail: string;
  field: string;
}

type GenerationPlatform =
  | "meta_feed"
  | "google_search"
  | "landing_page"
  | "email_drip"
  | "all";

/* ── Constants ───────────────────────────────────────────────── */

const VARIATION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-white/[0.06] text-[#A1A1A6]",
  review: "bg-yellow-500/10 text-yellow-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  published: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
};

const ANGLE_ICONS: Record<string, string> = {
  social_proof: "⭐",
  convenience: "📍",
  urgency: "⏰",
  lifestyle: "🏡",
  rsa: "🔍",
  full_page: "📄",
  nurture_sequence: "📧",
};

const PLATFORM_LABELS: Record<string, string> = {
  meta_feed: "Meta Ads",
  google_search: "Google RSA",
  landing_page: "Landing Page",
  email_drip: "Email Drip",
};

const PLATFORM_ICONS: Record<string, string> = {
  meta_feed: "📱",
  google_search: "🔍",
  landing_page: "📄",
  email_drip: "📧",
};

const GENERATION_OPTIONS: {
  id: GenerationPlatform;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    id: "meta_feed",
    label: "Meta Ads",
    icon: "📱",
    desc: "4 ad variations with distinct angles",
  },
  {
    id: "google_search",
    label: "Google RSA",
    icon: "🔍",
    desc: "15 headlines + 4 descriptions + sitelinks",
  },
  {
    id: "landing_page",
    label: "Landing Page",
    icon: "📄",
    desc: "Full page copy — hero, features, FAQ, CTA",
  },
  {
    id: "email_drip",
    label: "Email Drip",
    icon: "📧",
    desc: "4-email nurture sequence",
  },
  {
    id: "all",
    label: "Generate All",
    icon: "✨",
    desc: "All platforms in one shot",
  },
];

const CTA_OPTIONS = ["Learn More", "Get Quote", "Book Now", "Contact Us", "Sign Up"];

/* ── Helpers ─────────────────────────────────────────────────── */

function copyText(text: string) {
  navigator.clipboard.writeText(text);
}

/* ── Shared Variation Actions ────────────────────────────────── */

function VariationActions({
  v,
  saving,
  onApprove,
  onEdit,
  onReject,
  onUnapprove,
  onDelete,
  rejecting,
}: {
  v: AdVariation;
  saving: boolean;
  onApprove: () => void;
  onEdit?: () => void;
  onReject: () => void;
  onUnapprove: () => void;
  onDelete: () => void;
  rejecting: boolean;
}) {
  if (v.status === "published" || rejecting) return null;

  return (
    <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
      {v.status !== "approved" && (
        <button
          onClick={onApprove}
          disabled={saving || v.compliance_status === "failed"}
          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors"
        >
          {saving ? "..." : "Approve"}
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/[0.06] text-[#A1A1A6] hover:bg-white/[0.04] transition-colors"
        >
          Edit
        </button>
      )}
      {v.status !== "rejected" && (
        <button
          onClick={onReject}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Reject
        </button>
      )}
      {v.status === "approved" && (
        <button
          onClick={onUnapprove}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/[0.06] text-[#A1A1A6] hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
        >
          Unapprove
        </button>
      )}
      <button
        onClick={onDelete}
        disabled={saving}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/[0.06] text-[#6E6E73] hover:text-red-400 hover:border-red-500/20 disabled:opacity-40 transition-colors ml-auto"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

/* ── CopyField: inline text with clipboard copy ──────────────── */

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    copyText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group flex items-start gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[#6E6E73] w-20 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-[#F5F5F7] flex-1 leading-relaxed">
        {value}
      </span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-[#6E6E73] hover:text-[#A1A1A6] transition-all"
      >
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

/* ── Meta Ad Variation Card ──────────────────────────────────── */

function MetaVariationCard({
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
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const content = v.content_json as MetaAdContent;
  const [editFields, setEditFields] = useState(content);

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

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-[#111111]">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{ANGLE_ICONS[v.angle] || "📝"}</span>
          <span className="text-sm font-semibold text-[#F5F5F7]">
            {content.angleLabel || v.angle}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || "bg-white/[0.06] text-[#6E6E73]"}`}
          >
            {v.status}
          </span>
          {v.compliance_status && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                v.compliance_status === "passed"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : v.compliance_status === "flagged"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-red-500/10 text-red-400"
              }`}
            >
              {v.compliance_status === "passed" ? "✓ Compliant" : v.compliance_status === "flagged" ? "⚠ Review" : "✕ Violation"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#6E6E73]">v{v.version}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.04] text-[#6E6E73]">
            Meta
          </span>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 py-4">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium uppercase text-[#6E6E73] block mb-1">
                Primary Text
              </label>
              <textarea
                value={editFields.primaryText}
                onChange={(e) =>
                  setEditFields({ ...editFields, primaryText: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-[#0A0A0A] text-[#F5F5F7] focus:outline-none focus:border-[#3B82F6] transition-colors"
              />
              <p
                className={`text-xs mt-0.5 ${editFields.primaryText.length > 125 ? "text-red-400" : "text-[#6E6E73]"}`}
              >
                {editFields.primaryText.length}/125
              </p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-[#6E6E73] block mb-1">
                Headline
              </label>
              <input
                value={editFields.headline}
                onChange={(e) =>
                  setEditFields({ ...editFields, headline: e.target.value })
                }
                className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-[#0A0A0A] text-[#F5F5F7] focus:outline-none focus:border-[#3B82F6] transition-colors"
              />
              <p
                className={`text-xs mt-0.5 ${editFields.headline.length > 40 ? "text-red-400" : "text-[#6E6E73]"}`}
              >
                {editFields.headline.length}/40
              </p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-[#6E6E73] block mb-1">
                Description
              </label>
              <input
                value={editFields.description}
                onChange={(e) =>
                  setEditFields({ ...editFields, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-[#0A0A0A] text-[#F5F5F7] focus:outline-none focus:border-[#3B82F6] transition-colors"
              />
              <p
                className={`text-xs mt-0.5 ${editFields.description.length > 30 ? "text-red-400" : "text-[#6E6E73]"}`}
              >
                {editFields.description.length}/30
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium uppercase text-[#6E6E73] block mb-1">
                  CTA
                </label>
                <select
                  value={editFields.cta}
                  onChange={(e) =>
                    setEditFields({ ...editFields, cta: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-[#0A0A0A] text-[#F5F5F7] focus:outline-none focus:border-[#3B82F6] transition-colors"
                >
                  {CTA_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-[#6E6E73] block mb-1">
                  Targeting
                </label>
                <input
                  value={editFields.targetingNote}
                  onChange={(e) =>
                    setEditFields({
                      ...editFields,
                      targetingNote: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-[#0A0A0A] text-[#F5F5F7] focus:outline-none focus:border-[#3B82F6] transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  patchVariation({
                    content_json: editFields,
                    status: "approved",
                  });
                  setEditing(false);
                }}
                disabled={saving}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving..." : "Save & Approve"}
              </button>
              <button
                onClick={() => {
                  patchVariation({ content_json: editFields });
                  setEditing(false);
                }}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/[0.06] text-[#A1A1A6] hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditFields(content);
                }}
                className="px-3 py-1.5 text-xs text-[#6E6E73] hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg p-4 bg-[#0A0A0A]">
              <p className="text-sm leading-relaxed text-[#F5F5F7]">
                {content.primaryText}
              </p>
              <div className="mt-3 border-t border-white/[0.06] pt-3">
                <p className="text-xs uppercase tracking-wide text-[#6E6E73]">
                  storageads.com
                </p>
                <p className="font-semibold text-sm text-[#F5F5F7] mt-0.5">
                  {content.headline}
                </p>
                {content.description && (
                  <p className="text-xs text-[#6E6E73] mt-0.5">{content.description}</p>
                )}
              </div>
              <div className="mt-3">
                <span className="text-xs px-2.5 py-1 rounded font-medium bg-white/[0.06] text-[#A1A1A6]">
                  {content.cta}
                </span>
              </div>
            </div>

            {content.targetingNote && (
              <p className="text-[11px] text-[#6E6E73] px-1">
                <span className="text-[#A1A1A6] font-medium">Targeting:</span> {content.targetingNote}
              </p>
            )}

            {v.compliance_flags && v.compliance_flags.length > 0 && (
              <div className={`p-3 rounded-lg border text-sm ${
                v.compliance_status === "failed"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-amber-500/5 border-amber-500/20"
              }`}>
                <p className={`font-medium text-xs uppercase tracking-wide mb-2 ${
                  v.compliance_status === "failed" ? "text-red-400" : "text-amber-400"
                }`}>
                  {v.compliance_status === "failed" ? "Policy Violations" : "Compliance Review Needed"}
                </p>
                <ul className="space-y-1.5">
                  {v.compliance_flags.map((flag, i) => (
                    <li key={i} className="text-xs">
                      <span className={`font-medium ${flag.severity === "violation" ? "text-red-300" : "text-amber-300"}`}>
                        {flag.rule}
                      </span>
                      <span className="text-[#A1A1A6]"> ({flag.field}): </span>
                      <span className="text-[#6E6E73]">{flag.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {v.feedback && (
              <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/20 text-red-300 text-sm">
                <p className="font-medium text-xs uppercase tracking-wide mb-1">
                  Feedback
                </p>
                {v.feedback}
              </div>
            )}

            {rejecting && (
              <div className="space-y-2">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What needs to change? Be specific so we can regenerate better copy..."
                  rows={3}
                  className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-[#0A0A0A] text-[#F5F5F7] placeholder:text-[#6E6E73] focus:outline-none focus:border-[#3B82F6] transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      patchVariation({ status: "rejected", feedback });
                      setRejecting(false);
                      setFeedback("");
                    }}
                    disabled={!feedback.trim() || saving}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
                  >
                    {saving ? "..." : "Reject with Notes"}
                  </button>
                  <button
                    onClick={() => {
                      setRejecting(false);
                      setFeedback("");
                    }}
                    className="px-3 py-1.5 text-xs text-[#6E6E73] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <VariationActions
              v={v}
              saving={saving}
              onApprove={() => patchVariation({ status: "approved" })}
              onEdit={() => setEditing(true)}
              onReject={() => setRejecting(true)}
              onUnapprove={() => patchVariation({ status: "draft" })}
              onDelete={() => onDelete(v.id)}
              rejecting={rejecting}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Google RSA Card ─────────────────────────────────────────── */

function GoogleRSACard({
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
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-[#111111]">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-[#3B82F6]" />
          <span className="text-sm font-semibold text-[#F5F5F7]">
            Google Responsive Search Ad
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || "bg-white/[0.06] text-[#6E6E73]"}`}
          >
            {v.status}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[#6E6E73] hover:text-[#A1A1A6] flex items-center gap-1 transition-colors"
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

      <div className="border-t border-white/[0.06] px-4 py-4">
        {/* Google Search Preview */}
        <div className="rounded-lg p-4 bg-[#0A0A0A]">
          <p className="text-xs text-green-400 mb-0.5">
            Ad · stowstack.co{content.finalUrl || "/"}
          </p>
          <p className="text-base font-medium text-[#3B82F6] leading-snug">
            {headlines
              .slice(0, 3)
              .map((h) => h.text)
              .join(" | ")}
          </p>
          <p className="text-sm text-[#A1A1A6] mt-1 leading-relaxed">
            {descriptions[0]?.text || ""}
          </p>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Headlines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[#6E6E73]">
                  Headlines ({headlines.length}/15)
                </p>
                <button
                  onClick={() =>
                    copyToClipboard(
                      headlines.map((h) => h.text).join("\n"),
                      "headlines"
                    )
                  }
                  className="text-xs flex items-center gap-1 text-[#6E6E73] hover:text-[#A1A1A6] transition-colors"
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
                    className="flex items-center justify-between px-3 py-1.5 rounded text-sm bg-white/[0.03] border border-white/[0.04]"
                  >
                    <span className="text-[#F5F5F7]">{h.text}</span>
                    <span
                      className={`text-[10px] ${h.text.length > 30 ? "text-red-400" : "text-[#6E6E73]"}`}
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
                <p className="text-xs font-medium uppercase tracking-wide text-[#6E6E73]">
                  Descriptions ({descriptions.length}/4)
                </p>
                <button
                  onClick={() =>
                    copyToClipboard(
                      descriptions.map((d) => d.text).join("\n"),
                      "descriptions"
                    )
                  }
                  className="text-xs flex items-center gap-1 text-[#6E6E73] hover:text-[#A1A1A6] transition-colors"
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
                  className="px-3 py-2 rounded text-sm mb-1 bg-white/[0.03] border border-white/[0.04]"
                >
                  <span className="text-[#F5F5F7]">{d.text}</span>
                  <span
                    className={`text-[10px] ml-2 ${d.text.length > 90 ? "text-red-400" : "text-[#6E6E73]"}`}
                  >
                    {d.text.length}/90
                  </span>
                </div>
              ))}
            </div>

            {/* Sitelinks */}
            {sitelinks.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#6E6E73] mb-2">
                  Sitelink Extensions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sitelinks.map((s, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded bg-white/[0.03] border border-white/[0.04]"
                    >
                      <p className="text-sm font-medium text-[#3B82F6]">
                        {s.title}
                      </p>
                      <p className="text-xs text-[#6E6E73]">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {content.keywords?.length ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#6E6E73] mb-2">
                  Suggested Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {content.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-white/[0.04] text-[#A1A1A6]"
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

/* ── Landing Page Copy Card ──────────────────────────────────── */

function LandingPageCard({
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
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-[#111111]">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold text-[#F5F5F7]">
            Landing Page Copy
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || "bg-white/[0.06] text-[#6E6E73]"}`}
          >
            {v.status}
          </span>
          <span className="text-xs text-[#6E6E73]">
            {sections.length} sections
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[#6E6E73] hover:text-[#A1A1A6] flex items-center gap-1 transition-colors"
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

      <div className="border-t border-white/[0.06] px-4 py-4">
        {/* Hero preview */}
        {heroConfig && (
          <div className="rounded-lg p-5 bg-gradient-to-br from-[#0A0A0A] to-[#1a1a2e] text-white">
            {heroConfig.badgeText && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                {heroConfig.badgeText}
              </span>
            )}
            <h3 className="text-lg font-bold leading-tight mb-2">
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
          <div className="mt-3 p-3 rounded-lg bg-[#0A0A0A]">
            <p className="text-xs text-green-400">stowstack.co/storage/...</p>
            <p className="text-sm font-medium text-[#3B82F6]">
              {content.meta_title}
            </p>
            <p className="text-xs text-[#6E6E73] mt-0.5">
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
                  className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase bg-white/[0.06] text-[#A1A1A6]">
                      {section.section_type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-[#6E6E73]">
                      #{section.sort_order}
                    </span>
                  </div>
                  {(cfg.headline as string) && (
                    <p className="text-sm font-semibold text-[#F5F5F7]">
                      {cfg.headline as string}
                    </p>
                  )}
                  {(cfg.subheadline as string) && (
                    <p className="text-xs text-[#6E6E73] mt-0.5">
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
                          <li key={j} className="text-xs text-[#6E6E73]">
                            {"\u2022"}{" "}
                            {item.title ||
                              item.text ||
                              item.q ||
                              JSON.stringify(item).slice(0, 80)}
                          </li>
                        ))}
                      {(cfg.items as unknown[]).length > 3 && (
                        <li className="text-xs text-[#6E6E73]">
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
          <div className="mt-3 flex items-center gap-2 text-xs text-[#6E6E73]">
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

/* ── Email Drip Card ─────────────────────────────────────────── */

function EmailDripCard({
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
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-[#111111]">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-[#F5F5F7]">
            Email Drip Sequence
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || "bg-white/[0.06] text-[#6E6E73]"}`}
          >
            {v.status}
          </span>
          <span className="text-xs text-[#6E6E73]">
            {sequence.length} emails
          </span>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 py-4 space-y-2">
        {sequence.map((email, i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.04]"
          >
            <button
              onClick={() =>
                setExpandedEmail(expandedEmail === i ? null : i)
              }
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/[0.06] text-[#A1A1A6]">
                  Day {email.delayDays}
                </span>
                <div>
                  <p className="text-sm font-medium text-[#F5F5F7]">
                    {email.subject}
                  </p>
                  <p className="text-xs text-[#6E6E73]">{email.label}</p>
                </div>
              </div>
              {expandedEmail === i ? (
                <ChevronUp size={14} className="text-[#6E6E73]" />
              ) : (
                <ChevronDown size={14} className="text-[#6E6E73]" />
              )}
            </button>

            {expandedEmail === i && (
              <div className="px-4 pb-4 border-t border-white/[0.06]">
                {email.preheader && (
                  <p className="text-xs text-[#6E6E73] mt-3 mb-2 italic">
                    Preheader: {email.preheader}
                  </p>
                )}
                <div className="text-sm text-[#F5F5F7] leading-relaxed whitespace-pre-line mt-2">
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
          <div className="mt-3 flex items-center gap-2 text-xs text-[#6E6E73]">
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

/* ── Variation Router ────────────────────────────────────────── */

function VariationCard({
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
  switch (v.platform) {
    case "google_search":
      return (
        <GoogleRSACard
          v={v}
          adminKey={adminKey}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );
    case "landing_page":
      return (
        <LandingPageCard
          v={v}
          adminKey={adminKey}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );
    case "email_drip":
      return (
        <EmailDripCard
          v={v}
          adminKey={adminKey}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );
    default:
      return (
        <MetaVariationCard
          v={v}
          adminKey={adminKey}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );
  }
}

/* ── Main Component ──────────────────────────────────────────── */

export default function CreativeStudio({
  facilityId,
  adminKey,
}: {
  facilityId: string;
  adminKey: string;
}) {
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genPlatform, setGenPlatform] = useState<GenerationPlatform | null>(
    null
  );
  const [regenFeedback, setRegenFeedback] = useState("");
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/facility-creatives?facilityId=${facilityId}`, {
      headers: { "X-Admin-Key": adminKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.variations) setVariations(data.variations);
      })
      .catch(() => {
        setError("Failed to load creative variations. Please try refreshing.");
      })
      .finally(() => setLoading(false));
  }, [facilityId, adminKey]);

  const generateCopy = useCallback(
    async (platform: GenerationPlatform, feedbackText?: string) => {
      setGenerating(true);
      setGenPlatform(platform);
      try {
        const body: Record<string, string> = { facilityId, platform };
        if (feedbackText) body.feedback = feedbackText;

        const res = await fetch("/api/facility-creatives", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || `Generation failed (${res.status})`);
          setGenPlatform(null);
          return;
        }
        if (data.variations)
          setVariations((prev) => [...data.variations, ...prev]);
        setShowRegenInput(false);
        setRegenFeedback("");
        setGenPlatform(null);
      } catch (err) {
        setError("Creative generation failed. Please try again.");
        setGenPlatform(null);
      } finally {
        setGenerating(false);
      }
    },
    [facilityId, adminKey]
  );

  function handleUpdate(updated: AdVariation) {
    setVariations((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v))
    );
  }

  async function handleDelete(variationId: string) {
    setDeleting(variationId);
    try {
      await fetch("/api/facility-creatives", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ variationId }),
      });
      setVariations((prev) => prev.filter((v) => v.id !== variationId));
    } catch (err) {
      setError("Failed to delete variation. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  const platforms = [...new Set(variations.map((v) => v.platform))];
  const statuses = [...new Set(variations.map((v) => v.status))];
  const filtered = variations
    .filter((v) => filterPlatform === "all" || v.platform === filterPlatform)
    .filter((v) => filterStatus === "all" || v.status === filterStatus);
  const approved = variations.filter(
    (v) => v.status === "approved" || v.status === "published"
  ).length;
  const total = variations.length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="flex-1 text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h3 className="font-semibold text-[#F5F5F7]">Creative Studio</h3>
        {total > 0 && (
          <p className="text-sm text-[#6E6E73] mt-1">
            {approved}/{total} approved across {platforms.length} platform
            {platforms.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Regenerate with notes */}
      {showRegenInput && (
        <div className="border border-white/[0.06] rounded-xl p-4 bg-[#111111] space-y-3">
          <label className="text-xs font-medium text-[#A1A1A6] block">Direction for new variations</label>
          <textarea
            value={regenFeedback}
            onChange={(e) => setRegenFeedback(e.target.value)}
            placeholder="e.g., More urgency, mention the spring special, target families..."
            rows={2}
            className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-[#0A0A0A] text-[#F5F5F7] placeholder:text-[#6E6E73] focus:outline-none focus:border-[#3B82F6] transition-colors"
          />
          <div className="flex flex-wrap gap-2">
            {GENERATION_OPTIONS.filter((o) => o.id !== "all").map((opt) => (
              <button
                key={opt.id}
                onClick={() => generateCopy(opt.id, regenFeedback || undefined)}
                disabled={generating}
                className="px-3 py-1.5 bg-[#3B82F6] text-white text-xs font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 whitespace-nowrap transition-colors"
              >
                {generating && genPlatform === opt.id ? "Generating..." : `${opt.icon} ${opt.label}`}
              </button>
            ))}
            <button
              onClick={() => { setShowRegenInput(false); setRegenFeedback(""); }}
              className="px-3 py-1.5 text-xs text-[#6E6E73] hover:text-[#A1A1A6] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Generation buttons */}
      {!showRegenInput && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {GENERATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => generateCopy(opt.id)}
                disabled={generating}
                className={`flex flex-col items-start p-4 border rounded-xl transition-all ${
                  generating && genPlatform === opt.id
                    ? "border-[#3B82F6] bg-[#3B82F6]/10"
                    : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]"
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-sm font-semibold text-[#F5F5F7]">{opt.label}</span>
                </div>
                <span className="text-[11px] text-[#6E6E73] leading-snug">
                  {generating && genPlatform === opt.id ? (
                    <span className="flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Generating...
                    </span>
                  ) : (
                    opt.desc
                  )}
                </span>
              </button>
            ))}
          </div>
          {total > 0 && (
            <button
              onClick={() => setShowRegenInput(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/[0.06] text-[#A1A1A6] hover:bg-white/[0.04] flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} /> Regenerate with Notes
            </button>
          )}
        </div>
      )}

      {/* Filters: platform + status */}
      {(platforms.length > 1 || statuses.length > 1) && (
        <div className="flex gap-4 flex-wrap items-center border-t border-white/[0.06] pt-6">
          {platforms.length > 1 && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <Filter size={12} className="text-[#6E6E73] mr-1" />
              <button
                onClick={() => setFilterPlatform("all")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterPlatform === "all"
                    ? "bg-[#3B82F6] text-white"
                    : "text-[#6E6E73] hover:bg-white/[0.04]"
                }`}
              >
                All ({total})
              </button>
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterPlatform === p
                      ? "bg-[#3B82F6] text-white"
                      : "text-[#6E6E73] hover:bg-white/[0.04]"
                  }`}
                >
                  {PLATFORM_ICONS[p] || "📝"} {PLATFORM_LABELS[p] || p} ({variations.filter((v) => v.platform === p).length})
                </button>
              ))}
            </div>
          )}
          {statuses.length > 1 && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-[10px] uppercase tracking-wide text-[#6E6E73] mr-1">Status:</span>
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterStatus === "all"
                    ? "bg-[#3B82F6] text-white"
                    : "text-[#6E6E73] hover:bg-white/[0.04]"
                }`}
              >
                All
              </button>
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                    filterStatus === s
                      ? "bg-[#3B82F6] text-white"
                      : "text-[#6E6E73] hover:bg-white/[0.04]"
                  }`}
                >
                  {s} ({variations.filter((v) => v.status === s).length})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {total === 0 && !generating && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-white/[0.06]">
          <Sparkles size={32} className="mx-auto mb-3 text-[#6E6E73]" />
          <p className="font-medium text-[#F5F5F7]">No creative content yet</p>
          <p className="text-sm text-[#6E6E73] mt-1 max-w-md mx-auto">
            Choose a platform above to generate ad copy, landing page content, or email sequences using AI — enriched with your facility&apos;s real data.
          </p>
        </div>
      )}

      {/* Variation cards grouped by version */}
      {filtered.length > 0 &&
        (() => {
          const versions = [
            ...new Set(filtered.map((v) => v.version)),
          ].sort((a, b) => b - a);
          return versions.map((ver) => {
            const batch = filtered.filter((v) => v.version === ver);
            const batchPlatforms = [...new Set(batch.map((v) => v.platform))];

            return (
              <div key={ver} className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#6E6E73]">
                  Version {ver} &middot; {new Date(batch[0].created_at).toLocaleDateString()}
                </p>
                {batchPlatforms.map((plat) => {
                  const platBatch = batch.filter((v) => v.platform === plat);
                  const isMetaFeed = plat === "meta_feed";
                  return (
                    <div key={plat} className="space-y-3">
                      {batchPlatforms.length > 1 && (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] flex items-center gap-1.5">
                          {PLATFORM_ICONS[plat]} {PLATFORM_LABELS[plat] || plat}
                        </p>
                      )}
                      <div
                        className={
                          isMetaFeed
                            ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
                            : "space-y-4"
                        }
                      >
                        {platBatch.map((v) => (
                          <VariationCard
                            key={v.id}
                            v={v}
                            adminKey={adminKey}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
    </div>
  );
}
