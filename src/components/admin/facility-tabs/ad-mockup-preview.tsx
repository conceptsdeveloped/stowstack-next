"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Send,
  Image as ImageIcon,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Bookmark,
  Globe,
  Copy,
  Check,
  ChevronDown,
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
  draft: "bg-black/[0.04] text-[#6B7280]",
  approved: "bg-emerald-500/10 text-emerald-400",
  published: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
};

/* ── Ad Mockup Renderer ──────────────────────────────────────── */

function AdMockup({
  format,
  image,
  copy,
  facilityName,
}: {
  format: AdFormat;
  image: string | null;
  copy: Record<string, string>;
  facilityName: string;
}) {
  const headline = copy.headline || "Your Headline Here";
  const primaryText = copy.primaryText || "Your ad copy will appear here.";
  const description = copy.description || "";
  const cta = copy.cta || "Learn More";

  if (format === "instagram_story") {
    return (
      <div className="w-[270px] h-[480px] bg-black rounded-2xl overflow-hidden relative shadow-2xl flex-shrink-0">
        {image ? (
          <img
            src={image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] to-[#F9FAFB]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {/* Story progress dots */}
        <div className="absolute top-2 left-3 right-3 flex gap-1">
          <div className="h-0.5 flex-1 bg-white/60 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
        </div>
        {/* Status bar area */}
        <div className="absolute top-6 left-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-[9px] font-bold">
            SS
          </div>
          <div>
            <p className="text-white text-[10px] font-semibold">
              {facilityName}
            </p>
            <p className="text-[#6B7280] text-[8px]">Sponsored</p>
          </div>
        </div>
        {/* Content area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          <p className="text-white text-sm font-bold leading-tight">
            {headline}
          </p>
          <p className="text-[#111827]/80 text-[11px] leading-relaxed line-clamp-3">
            {primaryText}
          </p>
          {/* Swipe-up CTA */}
          <div className="flex justify-center pt-2">
            <div className="bg-white rounded-full px-5 py-1.5 text-[10px] font-bold text-black">
              {cta}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (format === "instagram_post") {
    return (
      <div className="w-[320px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-white">
        {/* Account header */}
        <div className="flex items-center gap-2 p-3">
          <div className="w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            SS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#111827]">
              {facilityName.toLowerCase().replace(/\s+/g, "")}
            </p>
            <p className="text-[10px] text-[#9CA3AF]">Sponsored</p>
          </div>
          <MoreHorizontal size={16} className="text-[#9CA3AF]" />
        </div>
        {/* Image with text overlay */}
        <div className="w-full aspect-square bg-[#F3F4F6] relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB]">
              <ImageIcon size={32} className="text-[#9CA3AF]" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
            <p className="text-white text-base font-bold">{headline}</p>
          </div>
        </div>
        {/* Like/comment/share icons */}
        <div className="flex items-center gap-4 px-3 py-2 text-[#111827]">
          <Heart size={20} />
          <MessageCircle size={20} />
          <Send size={20} />
          <div className="flex-1" />
          <Bookmark size={20} />
        </div>
        {/* Caption area */}
        <div className="px-3 pb-3">
          <p className="text-xs text-[#111827]">
            <span className="font-semibold">
              {facilityName.toLowerCase().replace(/\s+/g, "")}{" "}
            </span>
            {primaryText}
          </p>
          {description && (
            <p className="text-[10px] text-[#9CA3AF] mt-1">{description}</p>
          )}
          <div className="mt-2">
            <span className="inline-block bg-[#3B82F6] text-white text-[10px] font-semibold px-3 py-1 rounded">
              {cta}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (format === "facebook_feed") {
    return (
      <div className="w-[400px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-white">
        {/* Profile header */}
        <div className="flex items-center gap-2 p-3">
          <div className="w-10 h-10 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-xs font-bold">
            SS
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#111827]">
              {facilityName}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              Sponsored &middot;{" "}
              <Globe size={10} className="inline" />
            </p>
          </div>
          <MoreHorizontal size={18} className="text-[#9CA3AF]" />
        </div>
        <div className="px-3 pb-2">
          <p className="text-sm text-[#111827]">{primaryText}</p>
        </div>
        {/* Image */}
        <div className="w-full aspect-[1.91/1] bg-[#F3F4F6] relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB]">
              <ImageIcon size={32} className="text-[#9CA3AF]" />
            </div>
          )}
        </div>
        {/* Headline + link description */}
        <div className="px-3 py-2 border-t border-black/[0.08] bg-black/[0.02]">
          <p className="text-[10px] uppercase text-[#9CA3AF]">stowstack.co</p>
          <p className="text-sm font-semibold text-[#111827] truncate">
            {headline}
          </p>
          <p className="text-xs text-[#9CA3AF] truncate">{description}</p>
        </div>
        {/* Reactions bar */}
        <div className="px-3 py-2 border-t border-black/[0.08] flex items-center justify-between">
          <button className="px-4 py-1.5 text-xs font-semibold rounded bg-black/[0.04] text-[#111827]">
            {cta}
          </button>
          <div className="flex gap-4 text-[#9CA3AF]">
            <span className="text-xs">Like</span>
            <span className="text-xs">Comment</span>
            <span className="text-xs">Share</span>
          </div>
        </div>
      </div>
    );
  }

  if (format === "google_display") {
    return (
      <div className="w-[300px] border border-black/[0.08] rounded-lg overflow-hidden shadow-2xl flex-shrink-0 bg-white">
        {/* Banner image */}
        <div className="w-full h-[150px] bg-[#F3F4F6] relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB]">
              <ImageIcon size={24} className="text-[#9CA3AF]" />
            </div>
          )}
          <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">
            Ad
          </div>
        </div>
        {/* Headline, description, CTA button, display URL */}
        <div className="p-3 space-y-1.5">
          <p className="text-sm font-bold leading-tight text-[#111827]">
            {headline}
          </p>
          <p className="text-[11px] text-[#9CA3AF] line-clamp-2">
            {description || primaryText}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[#9CA3AF]">{facilityName}</span>
            <button className="bg-[#3B82F6] text-white text-[10px] font-semibold px-3 py-1 rounded">
              {cta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

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
        <Loader2 size={20} className="animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (!variations.length) {
    return (
      <div className="text-center py-12 border border-black/[0.08] rounded-xl bg-white">
        <ImageIcon size={32} className="mx-auto mb-3 text-[#9CA3AF]" />
        <p className="font-medium text-[#111827]">No ad copy available</p>
        <p className="text-sm text-[#9CA3AF] mt-1">
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
                ? "bg-[#3B82F6] text-white border-[#3B82F6]"
                : "border-black/[0.08] text-[#6B7280] hover:bg-black/[0.03]"
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 text-[10px] ${activeFormat === f.id ? "text-blue-200" : "text-[#9CA3AF]"}`}
            >
              {f.width}x{f.height}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ad Preview */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-[#111827]">Preview</h4>
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-black/[0.08] text-[#6B7280] text-sm font-medium rounded-lg hover:bg-black/[0.03] transition-colors"
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
            <h4 className="text-sm font-semibold text-[#111827] mb-2">
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
                          ? "border-[#3B82F6] bg-[#3B82F6]/10"
                          : "border-black/[0.08] bg-white hover:bg-black/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase bg-black/[0.04] text-[#6B7280]">
                          {c.angleLabel || v.angle}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BADGE[v.status] || ""}`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#111827] truncate">
                        {c.headline}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] line-clamp-2 mt-0.5">
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
              <h4 className="text-sm font-semibold text-[#111827]">Image</h4>
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => setImageSource("assets")}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    imageSource === "assets"
                      ? "bg-[#3B82F6] text-white"
                      : "text-[#9CA3AF] hover:bg-black/[0.03]"
                  }`}
                >
                  Facility ({assets.length})
                </button>
                <button
                  onClick={() => setImageSource("stock")}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    imageSource === "stock"
                      ? "bg-[#3B82F6] text-white"
                      : "text-[#9CA3AF] hover:bg-black/[0.03]"
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
                      ? "ring-2 ring-[#3B82F6]"
                      : "ring-1 ring-white/[0.06] hover:ring-white/[0.12]"
                  }`}
                >
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
                <p className="col-span-4 text-center text-xs text-[#9CA3AF] py-4">
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
