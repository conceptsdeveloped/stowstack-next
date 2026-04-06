"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Image as ImageIcon,
  Copy,
  Check,
} from "lucide-react";
import { AdMockup } from "./ad-mockup-renderer";

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

interface AdVariation {
  id: string;
  facility_id: string;
  brief_id: string | null;
  created_at: string;
  platform: string;
  format: string;
  angle: string;
  content_json: MetaAdContent | Record<string, unknown>;
  asset_urls: Record<string, string> | null;
  status: string;
  feedback: string | null;
  version: number;
}

interface Asset {
  id: string;
  facility_id: string;
  created_at: string;
  type: string;
  source: string;
  url: string;
  metadata: Record<string, unknown> | null;
}

type AdFormat =
  | "instagram_post"
  | "instagram_story"
  | "facebook_feed"
  | "google_display";

const AD_FORMATS: {
  id: AdFormat;
  label: string;
  width: number;
  height: number;
}[] = [
  { id: "instagram_post", label: "Instagram Post", width: 1080, height: 1080 },
  {
    id: "instagram_story",
    label: "Instagram Story",
    width: 1080,
    height: 1920,
  },
  { id: "facebook_feed", label: "Facebook Feed", width: 1200, height: 628 },
  { id: "google_display", label: "Google Display", width: 300, height: 250 },
];

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-[var(--color-light-gray)] text-[var(--color-body-text)]",
  approved: "bg-emerald-500/10 text-emerald-400",
  published: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
};

/* ── Main Component ──────────────────────────────────────────── */

export default function AdMockupPreview({
  facilityId,
  adminKey,
}: {
  facilityId: string;
  adminKey: string;
}) {
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariation, setSelectedVariation] =
    useState<AdVariation | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<AdFormat>("instagram_post");
  const [imageSource, setImageSource] = useState<"assets" | "stock">("assets");
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/facility-creatives?facilityId=${facilityId}`, {
        headers: { "X-Admin-Key": adminKey },
      }).then((r) => r.json()),
      fetch(`/api/facility-assets?facilityId=${facilityId}`, {
        headers: { "X-Admin-Key": adminKey },
      }).then((r) => r.json()),
    ])
      .then(([creativeData, assetData]) => {
        if (creativeData.variations?.length) {
          const approved = creativeData.variations.filter(
            (v: AdVariation) =>
              v.platform === "meta_feed" &&
              (v.status === "approved" || v.status === "published" || v.status === "draft")
          );
          setVariations(approved);
          if (approved.length) setSelectedVariation(approved[0]);
        }
        if (assetData.assets) {
          const photos = assetData.assets.filter(
            (a: Asset) => a.type === "photo"
          );
          setAssets(photos);
          if (photos.length > 0) setSelectedImage(photos[0].url);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [facilityId, adminKey]);

  function handleCopyPreview() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    );
  }

  if (!variations.length) {
    return (
      <div className="text-center py-12 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
        <ImageIcon size={32} className="mx-auto mb-3 text-[var(--color-mid-gray)]" />
        <p className="font-medium text-[var(--color-dark)]">No ad copy available</p>
        <p className="text-sm text-[var(--color-mid-gray)] mt-1">
          Go to the Creative Studio first to generate ad variations, then return
          here to preview mockups.
        </p>
      </div>
    );
  }

  const copy = (selectedVariation?.content_json || {}) as Record<
    string,
    string
  >;
  const facilityName = "Storage Facility";

  return (
    <div className="space-y-6">
      {/* Format selector tabs */}
      <div className="flex flex-wrap gap-2">
        {AD_FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFormat(f.id)}
            className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
              activeFormat === f.id
                ? "bg-[var(--color-gold)] text-[var(--color-light)] border-[var(--color-gold)]"
                : "border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 text-[10px] ${activeFormat === f.id ? "text-[var(--color-blue)]" : "text-[var(--color-mid-gray)]"}`}
            >
              {f.width}x{f.height}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ad Preview */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-[var(--color-dark)]">Preview</h4>
          <div className="flex justify-center" ref={previewRef}>
            <AdMockup
              format={activeFormat}
              image={selectedImage}
              copy={copy}
              facilityName={facilityName}
            />
          </div>
          <button
            onClick={handleCopyPreview}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--border-subtle)] text-[var(--color-body-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-light-gray)] transition-colors"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" /> Preview
                Captured
              </>
            ) : (
              <>
                <Copy size={14} /> Copy Preview
              </>
            )}
          </button>
        </div>

        {/* Right: Controls */}
        <div className="space-y-5">
          {/* Copy variation selector dropdown */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-dark)] mb-2">
              Ad Copy
            </h4>
            <div className="space-y-2">
              {variations
                .filter((v) => v.status !== "rejected")
                .map((v) => {
                  const c = v.content_json as MetaAdContent;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariation(v)}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${
                        selectedVariation?.id === v.id
                          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10"
                          : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--color-light-gray)]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                          {c.angleLabel || v.angle}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BADGE[v.status] || ""}`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[var(--color-dark)] truncate">
                        {c.headline}
                      </p>
                      <p className="text-[11px] text-[var(--color-mid-gray)] line-clamp-2 mt-0.5">
                        {c.primaryText}
                      </p>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Image selector */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold text-[var(--color-dark)]">Image</h4>
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => setImageSource("assets")}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    imageSource === "assets"
                      ? "bg-[var(--color-gold)] text-[var(--color-light)]"
                      : "text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]"
                  }`}
                >
                  Facility ({assets.length})
                </button>
                <button
                  onClick={() => setImageSource("stock")}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    imageSource === "stock"
                      ? "bg-[var(--color-gold)] text-[var(--color-light)]"
                      : "text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]"
                  }`}
                >
                  Stock
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {assets.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className={`relative rounded-lg overflow-hidden transition-all ${
                    selectedImage === img.url
                      ? "ring-2 ring-[var(--color-gold)]"
                      : "ring-1 ring-[var(--border-subtle)] hover:ring-[var(--border-medium)]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="h-16 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </button>
              ))}
              {assets.length === 0 && (
                <p className="col-span-4 text-center text-xs text-[var(--color-mid-gray)] py-4">
                  {imageSource === "assets"
                    ? "No facility photos. Upload images in the Media Library tab."
                    : "No stock images available."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
