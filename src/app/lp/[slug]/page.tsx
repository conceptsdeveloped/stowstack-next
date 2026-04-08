"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTrackingParams } from "@/hooks/use-tracking-params";
import {
  Phone,
  Mail,
  MapPin,
  Check,
  Star,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Truck,
  ArrowRight,
  Building2,
  ExternalLink,
  X,
  Loader2,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════ */
/*  TYPES                                                  */
/* ═══════════════════════════════════════════════════════ */

interface SectionConfig {
  [key: string]: unknown;
}

interface Section {
  id: string;
  section_type: string;
  sort_order: number;
  config: SectionConfig;
}

interface ThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  darkHero?: boolean;
}

interface LandingPage {
  id: string;
  facility_id: string;
  slug: string;
  title: string;
  status: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  theme?: ThemeConfig;
  storedge_widget_url?: string;
  sections: Section[];
  orgBranding?: OrgBranding;
}

interface OrgBranding {
  orgName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  whiteLabel?: boolean;
}

/* ═══════════════════════════════════════════════════════ */
/*  SECTION RENDERERS                                      */
/* ═══════════════════════════════════════════════════════ */

function iconForName(name: string | undefined, size = 14) {
  switch (name) {
    case "star":
      return <Star size={size} className="text-yellow-300" />;
    case "shield":
      return <Shield size={size} />;
    case "clock":
      return <Clock size={size} />;
    case "check":
      return <Check size={size} />;
    case "truck":
      return <Truck size={size} />;
    case "building":
      return <Building2 size={size} />;
    default:
      return <Check size={size} />;
  }
}

function HeroSection({
  config,
  theme,
}: {
  config: SectionConfig;
  theme?: ThemeConfig;
}) {
  const isDark = config.style !== "light";
  const pc = theme?.primaryColor;
  return (
    <section
      className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden"
      style={{
        background: isDark
          ? "linear-gradient(to bottom, #050505, #0A0A0A, #111111)"
          : "linear-gradient(to bottom, #f8fafc, #ffffff)",
      }}
    >
      {isDark && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse"
            style={{ background: "rgba(59,130,246,0.08)" }}
          />
          <div
            className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl"
            style={{ background: "rgba(99,102,241,0.04)" }}
          />
        </div>
      )}

      {typeof config.backgroundImage === "string" && config.backgroundImage && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.backgroundImage}
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/95" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-5 relative">
        <div className="max-w-3xl mx-auto text-center">
          {typeof config.badgeText === "string" && config.badgeText && (
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6 ${
                isDark
                  ? "bg-blue-500/20 border border-blue-500/30 text-blue-300"
                  : "bg-blue-50 border border-blue-200 text-blue-700"
              }`}
            >
              {config.badgeText as string}
            </div>
          )}

          <h1
            className={`text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.08] mb-6 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {(config.headline as string) || "Your Storage Solution"}
          </h1>

          {typeof config.subheadline === "string" && config.subheadline && (
            <p
              className={`text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-8 ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {config.subheadline}
            </p>
          )}

          {typeof config.ctaText === "string" && config.ctaText && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={(config.ctaUrl as string) || "#cta"}
                className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold text-[#111827] shadow-lg transition-all ${pc ? "" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"}`}
                style={
                  pc
                    ? {
                        background: pc,
                        boxShadow: `0 10px 15px -3px ${pc}40`,
                      }
                    : undefined
                }
              >
                {config.ctaText as string}
                <ArrowRight size={16} />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TrustBarSection({
  config,
  theme,
}: {
  config: SectionConfig;
  theme?: ThemeConfig;
}) {
  const items = (config.items as { icon?: string; text: string }[]) || [];
  if (items.length === 0) return null;

  return (
    <section
      className={`py-6 ${theme?.primaryColor ? "" : "bg-blue-600"}`}
      style={
        theme?.primaryColor ? { background: theme.primaryColor } : undefined
      }
    >
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-white/90 text-sm font-medium"
            >
              {iconForName(item.icon)}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({
  config,
  theme,
}: {
  config: SectionConfig;
  theme?: ThemeConfig;
}) {
  const items =
    (config.items as { icon?: string; title: string; desc: string }[]) || [];
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        {typeof config.headline === "string" && config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
              {config.headline}
            </h2>
            {typeof config.subheadline === "string" && config.subheadline && (
              <p className="text-lg text-slate-500 mt-3 max-w-2xl mx-auto">
                {config.subheadline}
              </p>
            )}
          </div>
        )}
        <div
          className={`grid gap-6 ${items.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-100"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${theme?.primaryColor ? "" : "bg-blue-100 text-blue-600"}`}
                style={
                  theme?.primaryColor
                    ? {
                        background: `${theme.primaryColor}20`,
                        color: theme.primaryColor,
                      }
                    : undefined
                }
              >
                {iconForName(item.icon, 20)}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UnitTypesSection({
  config,
  theme,
}: {
  config: SectionConfig;
  theme?: ThemeConfig;
}) {
  const units =
    (config.units as {
      name: string;
      size?: string;
      price?: string;
      features?: string[];
    }[]) || [];
  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-5">
        {typeof config.headline === "string" && config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
              {config.headline}
            </h2>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {unit.name}
              </h3>
              {unit.size && (
                <p className="text-sm text-slate-500 mb-3">{unit.size}</p>
              )}
              {unit.price && (
                <p
                  className={`text-2xl font-semibold mb-4 ${theme?.primaryColor ? "" : "text-blue-600"}`}
                  style={
                    theme?.primaryColor
                      ? { color: theme.primaryColor }
                      : undefined
                  }
                >
                  {unit.price}
                  <span className="text-sm font-normal text-slate-400">
                    /mo
                  </span>
                </p>
              )}
              {unit.features && unit.features.length > 0 && (
                <ul className="space-y-2">
                  {unit.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-2 text-sm text-slate-600"
                    >
                      <Check
                        size={14}
                        className={`shrink-0 ${theme?.primaryColor ? "" : "text-blue-500"}`}
                        style={
                          theme?.primaryColor
                            ? { color: theme.primaryColor }
                            : undefined
                        }
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ config }: { config: SectionConfig }) {
  const images = (config.images as { url: string; alt?: string }[]) || [];
  if (images.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        {typeof config.headline === "string" && config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
              {config.headline}
            </h2>
          </div>
        )}
        <div
          className={`grid gap-3 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}
        >
          {images.map((img, i) => (
            <div
              key={i}
              className={`rounded-xl overflow-hidden ${i === 0 && images.length > 2 ? "col-span-2 row-span-2" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt || "Facility photo"}
                className="w-full h-full object-cover"
                style={{ minHeight: 200 }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({
  config,
}: {
  config: SectionConfig;
}) {
  const items =
    (config.items as {
      name: string;
      role?: string;
      text: string;
      metric?: string;
    }[]) || [];
  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-5">
        {typeof config.headline === "string" && config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
              {config.headline}
            </h2>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white border border-slate-200"
            >
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    className="text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.name}
                  </p>
                  {item.role && (
                    <p className="text-xs text-slate-400">{item.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ config }: { config: SectionConfig }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const items = (config.items as { q: string; a: string }[]) || [];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-5">
        {typeof config.headline === "string" && config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
              {config.headline}
            </h2>
          </div>
        )}
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-900 pr-4">
                  {item.q}
                </span>
                {openIdx === i ? (
                  <ChevronUp
                    size={16}
                    className="text-slate-400 shrink-0"
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    className="text-slate-400 shrink-0"
                  />
                )}
              </button>
              {openIdx === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({
  config,
  theme,
  widgetUrl,
}: {
  config: SectionConfig;
  theme?: ThemeConfig;
  widgetUrl?: string;
}) {
  const isGradient = config.style !== "simple";
  return (
    <section
      id="cta"
      className={`py-16 md:py-24 ${isGradient ? "text-white" : ""}`}
      style={
        isGradient
          ? {
              background:
                "linear-gradient(135deg, #050505 0%, #0A0A0A 50%, #111111 100%)",
            }
          : {}
      }
    >
      <div className="max-w-4xl mx-auto px-5 text-center">
        <h2
          className={`text-3xl md:text-4xl font-semibold tracking-tight mb-5 ${isGradient ? "text-white" : "text-slate-900"}`}
        >
          {(config.headline as string) || "Ready to Get Started?"}
        </h2>
        {typeof config.subheadline === "string" && config.subheadline && (
          <p
            className={`text-lg leading-relaxed max-w-2xl mx-auto mb-8 ${isGradient ? "text-[#6B7280]" : "text-slate-500"}`}
          >
            {config.subheadline}
          </p>
        )}

        {widgetUrl && (
          <div className="max-w-2xl mx-auto mb-8 rounded-2xl overflow-hidden shadow-xl">
            <iframe
              src={widgetUrl}
              title="Reserve your unit"
              className="w-full border-0"
              style={{ minHeight: 520 }}
              allow="payment"
              loading="lazy"
            />
          </div>
        )}

        {!widgetUrl && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {typeof config.ctaText === "string" && config.ctaText && (
              <a
                href={(config.ctaUrl as string) || "#"}
                className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold text-[#111827] shadow-lg transition-all ${theme?.primaryColor ? "" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"}`}
                style={
                  theme?.primaryColor
                    ? {
                        background: theme.primaryColor,
                        boxShadow: `0 10px 15px -3px ${theme.primaryColor}40`,
                      }
                    : undefined
                }
              >
                {config.ctaText as string}
                <ArrowRight size={16} />
              </a>
            )}
            {typeof config.phone === "string" && config.phone && (
              <a
                href={`tel:${(config.phone as string).replace(/[^+\d]/g, "")}`}
                className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-base font-medium border transition-colors ${
                  isGradient
                    ? "border-white/20 text-white hover:bg-black/5"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Phone size={16} /> {config.phone as string}
              </a>
            )}
          </div>
        )}

        {typeof config.email === "string" && config.email && (
          <a
            href={`mailto:${config.email}`}
            className={`inline-flex items-center gap-2 text-sm ${isGradient ? "text-[#9CA3AF] hover:text-[#111827]/70" : "text-slate-400 hover:text-slate-600"} transition-colors`}
          >
            <Mail size={14} /> {config.email as string}
          </a>
        )}
      </div>
    </section>
  );
}

function LocationMapSection({
  config,
  theme,
}: {
  config: SectionConfig;
  theme?: ThemeConfig;
}) {
  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            {typeof config.headline === "string" && config.headline && (
              <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight mb-4">
                {config.headline}
              </h2>
            )}
            {typeof config.address === "string" && config.address && (
              <div className="flex items-start gap-3 mb-4">
                <MapPin
                  size={18}
                  className={`shrink-0 mt-0.5 ${theme?.primaryColor ? "" : "text-blue-600"}`}
                  style={
                    theme?.primaryColor
                      ? { color: theme.primaryColor }
                      : undefined
                  }
                />
                <p className="text-slate-600">{config.address as string}</p>
              </div>
            )}
            {typeof config.directions === "string" && config.directions && (
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {config.directions as string}
              </p>
            )}
            {typeof config.address === "string" && config.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address as string)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 text-sm font-medium ${theme?.primaryColor ? "" : "text-blue-600 hover:text-blue-700"}`}
                style={
                  theme?.primaryColor
                    ? { color: theme.primaryColor }
                    : undefined
                }
              >
                Get Directions <ExternalLink size={14} />
              </a>
            )}
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-200 min-h-[300px]">
            {typeof config.googleMapsEmbed === "string" &&
            config.googleMapsEmbed ? (
              <iframe
                src={config.googleMapsEmbed}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Facility location"
              />
            ) : typeof config.address === "string" && config.address ? (
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(config.address as string)}&output=embed`}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Facility location"
              />
            ) : (
              <div className="w-full h-[300px] flex items-center justify-center text-slate-400 text-sm">
                <MapPin size={32} className="text-slate-300" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StorEdgeEmbedSection({
  config,
  widgetUrl,
}: {
  config: SectionConfig;
  theme?: ThemeConfig;
  widgetUrl?: string;
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const searchParams = useSearchParams();

  const buildWidgetUrl = () => {
    const base = widgetUrl || (config.widgetUrl as string);
    if (!base) return null;
    try {
      const url = new URL(base);
      const utmKeys = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
      ];
      utmKeys.forEach((key) => {
        const val = searchParams.get(key);
        if (val) url.searchParams.set(key, val);
      });
      return url.toString();
    } catch {
      return base;
    }
  };

  const finalUrl = buildWidgetUrl();

  return (
    <section id="reserve" className="py-16 md:py-24 bg-white">
      <div className="max-w-4xl mx-auto px-5">
        {typeof config.headline === "string" && config.headline && (
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
              {config.headline}
            </h2>
            {typeof config.subheadline === "string" && config.subheadline && (
              <p className="text-lg text-slate-500 mt-3 max-w-2xl mx-auto">
                {config.subheadline as string}
              </p>
            )}
          </div>
        )}

        {finalUrl ? (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    Loading available units...
                  </p>
                </div>
              </div>
            )}
            <iframe
              src={finalUrl}
              title="Reserve your unit"
              className="w-full border-0"
              style={{ minHeight: 800 }}
              allow="payment"
              loading="lazy"
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
        ) : (
          <div className="text-center p-12 rounded-2xl bg-slate-50 border border-slate-200">
            <Phone size={32} className="mx-auto mb-4 text-blue-600" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Call to Reserve Your Unit
            </h3>
            <p className="text-slate-500 mb-4">
              Speak with our team to find the right unit for you.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function LeadCaptureFormSection({
  config,
  theme,
  facilityId,
  landingPageId,
}: {
  config: SectionConfig;
  theme?: ThemeConfig;
  facilityId?: string;
  landingPageId?: string;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    unitSize: "",
    timeline: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  const pc = theme?.primaryColor || "#3B82F6";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Please fill in name, email, and phone.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const sessionId =
        sessionStorage.getItem("storageads_session_id") ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      const res = await fetch("/api/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          unitSize: form.unitSize,
          timeline: form.timeline,
          facilityId,
          landingPageId,
          sessionId,
          utmSource: searchParams.get("utm_source") || undefined,
          utmMedium: searchParams.get("utm_medium") || undefined,
          utmCampaign: searchParams.get("utm_campaign") || undefined,
          utmContent: searchParams.get("utm_content") || undefined,
          referrer: document.referrer || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");

      if (typeof window !== "undefined") {
        const w = window as unknown as Record<string, unknown>;
        if (typeof w.fbq === "function")
          (w.fbq as (...args: unknown[]) => void)("track", "Lead", {
            content_name: "lead_capture_form",
            content_category: "storage",
          });
        if (typeof w.gtag === "function")
          (w.gtag as (...args: unknown[]) => void)("event", "generate_lead", {
            event_category: "engagement",
            event_label: "lead_capture_form",
          });
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or call us.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section id="lead-form" className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-lg mx-auto px-5 text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: `${pc}20` }}
          >
            <Check size={32} style={{ color: pc }} />
          </div>
          <h3 className="text-2xl font-semibold text-slate-900 mb-2">
            Got it — we will be in touch.
          </h3>
          <p className="text-slate-500">
            Check your email for next steps. If you need a unit today, scroll
            down to reserve online or call us directly.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="lead-form" className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-lg mx-auto px-5">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">
            {(config.headline as string) || "Check Availability"}
          </h2>
          {typeof config.subheadline === "string" && config.subheadline && (
            <p className="text-slate-500 mt-2">
              {config.subheadline as string}
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
              placeholder="Your full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
              placeholder="(555) 123-4567"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Unit size needed
            </label>
            <select
              value={form.unitSize}
              onChange={(e) => setForm({ ...form, unitSize: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent bg-white"
            >
              <option value="">Select a size...</option>
              <option value="5x5">5x5 (Closet)</option>
              <option value="5x10">5x10 (Half Garage)</option>
              <option value="10x10">10x10 (Full Garage)</option>
              <option value="10x15">10x15 (Large)</option>
              <option value="10x20">10x20 (Extra Large)</option>
              <option value="10x30">10x30 (Oversized)</option>
              <option value="other">Other / Not Sure</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Move-in timeline
            </label>
            <select
              value={form.timeline}
              onChange={(e) => setForm({ ...form, timeline: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent bg-white"
            >
              <option value="">When do you need it?</option>
              <option value="this-week">This week</option>
              <option value="within-2-weeks">Within 2 weeks</option>
              <option value="within-a-month">Within a month</option>
              <option value="just-exploring">Just exploring</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl text-base font-semibold text-[#111827] transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: pc }}
          >
            {submitting
              ? "Sending..."
              : (config.ctaText as string) || "Check Availability"}
          </button>

          <p className="text-xs text-slate-400 text-center">
            No spam. Your info is only used to help you find the right unit.
          </p>
        </form>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  SECTION ROUTER                                         */
/* ═══════════════════════════════════════════════════════ */

function RenderSection({
  section,
  theme,
  widgetUrl,
  trackingPhone,
  facilityId,
  landingPageId,
}: {
  section: Section;
  theme?: ThemeConfig;
  widgetUrl?: string;
  trackingPhone?: string | null;
  facilityId?: string;
  landingPageId?: string;
}) {
  const { section_type, config } = section;
  const effectiveConfig =
    trackingPhone && typeof config.phone === "string"
      ? { ...config, phone: trackingPhone }
      : config;
  switch (section_type) {
    case "hero":
      return <HeroSection config={effectiveConfig} theme={theme} />;
    case "trust_bar":
      return <TrustBarSection config={config} theme={theme} />;
    case "features":
      return <FeaturesSection config={config} theme={theme} />;
    case "unit_types":
      return <UnitTypesSection config={config} theme={theme} />;
    case "gallery":
      return <GallerySection config={config} />;
    case "testimonials":
      return <TestimonialsSection config={config} />;
    case "faq":
      return <FAQSection config={config} />;
    case "cta":
      return (
        <CTASection
          config={effectiveConfig}
          theme={theme}
          widgetUrl={widgetUrl}
        />
      );
    case "location_map":
      return <LocationMapSection config={config} theme={theme} />;
    case "storedge_embed":
      return (
        <StorEdgeEmbedSection
          config={config}
          theme={theme}
          widgetUrl={widgetUrl}
        />
      );
    case "lead_capture":
      return (
        <LeadCaptureFormSection
          config={config}
          theme={theme}
          facilityId={facilityId}
          landingPageId={landingPageId}
        />
      );
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════ */
/*  EXIT INTENT POPUP                                      */
/* ═══════════════════════════════════════════════════════ */

function ExitIntentPopup({
  show,
  onDismiss,
  onSubmit,
  theme,
  facilityName,
}: {
  show: boolean;
  onDismiss: () => void;
  onSubmit: (email: string) => void;
  theme?: ThemeConfig;
  facilityName?: string;
}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      onSubmit(email);
      setSubmitted(true);
    }
  };

  const pc = theme?.primaryColor || "#3B82F6";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div
          className="p-6 pt-8 text-center"
          style={{
            background: `linear-gradient(135deg, ${pc}10, ${pc}05)`,
          }}
        >
          {submitted ? (
            <>
              <div
                className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: `${pc}20` }}
              >
                <Check size={24} style={{ color: pc }} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                You are all set!
              </h3>
              <p className="text-sm text-slate-500">
                We will send you availability updates
                {facilityName ? ` for ${facilityName}` : ""}. Check your inbox.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Wait — don&apos;t lose your spot!
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                Enter your email and we will save your progress. Plus, we will
                let you know if availability changes
                {facilityName ? ` at ${facilityName}` : ""}.
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl text-sm font-semibold text-[#111827] transition-opacity hover:opacity-90"
                  style={{ background: pc }}
                >
                  Save My Spot
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-3">
                No spam. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  NAV & FOOTER                                           */
/* ═══════════════════════════════════════════════════════ */

function LandingPageNav({
  facilityName,
  theme,
  orgBranding,
}: {
  facilityName?: string;
  theme?: ThemeConfig;
  orgBranding?: OrgBranding | null;
}) {
  const pc = theme?.primaryColor || orgBranding?.primaryColor;
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {orgBranding?.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={orgBranding.logoUrl}
              alt={orgBranding.orgName || ""}
              className="h-6 object-contain"
            />
          )}
          <span className="text-sm font-semibold text-slate-900">
            {facilityName || "Self Storage"}
          </span>
        </div>
        <a
          href="#cta"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#111827] transition-colors ${pc ? "" : "bg-blue-600 hover:bg-blue-700"}`}
          style={pc ? { background: pc } : undefined}
        >
          Reserve Now
        </a>
      </div>
    </nav>
  );
}

function LandingPageFooter({
  orgBranding,
}: {
  orgBranding?: OrgBranding | null;
}) {
  const hideStorageAds = orgBranding?.whiteLabel;
  return (
    <footer className="py-8 bg-white text-center">
      {hideStorageAds ? (
        orgBranding?.orgName && (
          <p className="text-xs text-slate-500">{orgBranding.orgName}</p>
        )
      ) : (
        <p className="text-xs text-slate-500">
          Powered by{" "}
          <Link
            href="/"
            className="text-[var(--accent)] hover:text-blue-400"
          >
            StorageAds
          </Link>
        </p>
      )}
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                         */
/* ═══════════════════════════════════════════════════════ */

export default function LandingPageRoute() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [trackingPhone, setTrackingPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const pageTrackerInitialized = useRef(false);

  // Wire into visit tracking (fires once per session)
  useTrackingParams(page?.id, page?.facility_id);

  // Capture UTM params on mount
  useEffect(() => {
    const utm = {
      source: searchParams.get("utm_source"),
      medium: searchParams.get("utm_medium"),
      campaign: searchParams.get("utm_campaign"),
      content: searchParams.get("utm_content"),
      term: searchParams.get("utm_term"),
      fbclid: searchParams.get("fbclid"),
      gclid: searchParams.get("gclid"),
    };
    if (utm.fbclid) sessionStorage.setItem("storageads_fbclid", utm.fbclid);
    if (utm.gclid) sessionStorage.setItem("storageads_gclid", utm.gclid);

    // Generate session ID
    if (!sessionStorage.getItem("storageads_session_id")) {
      sessionStorage.setItem(
        "storageads_session_id",
        `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      );
    }
  }, [searchParams]);

  // Exit intent handler
  useEffect(() => {
    if (!page || sessionStorage.getItem("storageads_exit_dismissed")) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !showExitPopup) {
        setShowExitPopup(true);
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [page, showExitPopup]);

  const handleExitDismiss = useCallback(() => {
    setShowExitPopup(false);
    sessionStorage.setItem("storageads_exit_dismissed", "1");
  }, []);

  const handleExitSubmit = useCallback(
    (email: string) => {
      const sessionId = sessionStorage.getItem("storageads_session_id");
      if (sessionId && page) {
        fetch("/api/consumer-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            email,
            facilityId: page.facility_id,
            landingPageId: page.id,
            fbclid:
              sessionStorage.getItem("storageads_fbclid") || undefined,
            gclid:
              sessionStorage.getItem("storageads_gclid") || undefined,
          }),
          keepalive: true,
        }).catch(() => {});
      }

      setTimeout(() => {
        setShowExitPopup(false);
        sessionStorage.setItem("storageads_exit_dismissed", "1");
      }, 2000);
    },
    [page]
  );

  // Fetch page data
  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch(
          `/api/landing-pages?slug=${encodeURIComponent(slug)}`,
        );
        if (res.status === 404) {
          setError("Page not found");
          return;
        }
        if (!res.ok) throw new Error("Failed to load page");
        const data = await res.json();
        const pageData = data.page;
        setPage(pageData);

        // Fetch tracking number
        if (pageData?.id) {
          try {
            const tnRes = await fetch(
              `/api/call-tracking?landingPageId=${pageData.id}`
            );
            if (tnRes.ok) {
              const tnData = await tnRes.json();
              if (tnData.trackingPhone) setTrackingPhone(tnData.trackingPhone);
            }
          } catch {
            /* fall back to default phone */
          }
        }

        // Set SEO meta
        if (pageData?.meta_title) document.title = pageData.meta_title;
        else if (pageData?.title) document.title = pageData.title;

        const metaDesc = document.querySelector('meta[name="description"]');
        if (pageData?.meta_description && metaDesc) {
          metaDesc.setAttribute("content", pageData.meta_description);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [slug]);

  // Track page view and interactions
  useEffect(() => {
    if (!page || pageTrackerInitialized.current) return;
    pageTrackerInitialized.current = true;

    const w = window as unknown as Record<string, unknown>;
    // Generate shared event_id for browser/server deduplication
    const capiEventId = crypto.randomUUID();

    if (typeof w.fbq === "function")
      (w.fbq as (...args: unknown[]) => void)("track", "PageView", {}, { eventID: capiEventId });
    if (typeof w.gtag === "function")
      (w.gtag as (...args: unknown[]) => void)("event", "page_view", {
        page_title: page.title,
        page_location: window.location.href,
      });

    // Fire server-side CAPI with matching event_id
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid") || undefined;
    fetch("/api/meta-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "PageView",
        event_time: Math.floor(Date.now() / 1000),
        event_id: capiEventId,
        event_source_url: window.location.href,
        action_source: "website",
        user_data: {
          fbc: fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined,
          fbp: document.cookie.match(/_fbp=([^;]+)/)?.[1] || undefined,
          client_user_agent: navigator.userAgent,
        },
        custom_data: {
          content_name: page.title,
          content_type: "landing_page",
        },
      }),
      keepalive: true,
    }).catch(() => {});

    // Track page interactions (scroll, time, etc.)
    const sessionId = sessionStorage.getItem("storageads_session_id");
    let maxScroll = 0;
    const startTime = Date.now();

    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
          100
      );
      if (scrollPercent > maxScroll) maxScroll = scrollPercent;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    const sendInteraction = () => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      fetch("/api/page-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landingPageId: page.id,
          facilityId: page.facility_id,
          sessionId,
          scrollDepth: maxScroll,
          timeOnPage,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    // Send interaction data on unload
    window.addEventListener("beforeunload", sendInteraction);

    // Also send periodically (every 30s)
    const interval = setInterval(sendInteraction, 30000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", sendInteraction);
      clearInterval(interval);
      sendInteraction();
    };
  }, [page]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-5">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-slate-500 mb-6">
          This landing page doesn&apos;t exist or hasn&apos;t been published
          yet.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Go to homepage
        </Link>
      </div>
    );
  }

  const heroSection = page.sections.find((s) => s.section_type === "hero");
  const facilityName = heroSection?.config?.facilityName as string | undefined;
  const ctaSection = page.sections.find((s) => s.section_type === "cta");
  const heroPhone = page.sections.find((s) => s.section_type === "hero")?.config
    ?.phone as string | undefined;
  const displayPhone =
    trackingPhone ||
    (ctaSection?.config?.phone as string) ||
    heroPhone;

  return (
    <div className="min-h-screen bg-white">
      <LandingPageNav
        facilityName={facilityName}
        theme={page.theme}
        orgBranding={page.orgBranding}
      />
      <main>
        {page.sections
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((section) => (
            <RenderSection
              key={section.id}
              section={section}
              theme={page.theme}
              widgetUrl={page.storedge_widget_url}
              trackingPhone={trackingPhone}
              facilityId={page.facility_id}
              landingPageId={page.id}
            />
          ))}
      </main>
      <LandingPageFooter orgBranding={page.orgBranding} />

      {/* Mobile sticky phone bar */}
      {displayPhone && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="flex items-center gap-3 px-4 py-3">
            <a
              href={`tel:${displayPhone.replace(/[^+\d]/g, "")}`}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[#111827]"
              style={{
                background: page.theme?.primaryColor || "#3B82F6",
              }}
            >
              <Phone size={16} /> Call Now
            </a>
            <a
              href="#reserve"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700"
            >
              Reserve Online
            </a>
          </div>
        </div>
      )}

      {/* Exit Intent Popup */}
      <ExitIntentPopup
        show={showExitPopup}
        onDismiss={handleExitDismiss}
        onSubmit={handleExitSubmit}
        theme={page.theme}
        facilityName={facilityName}
      />
    </div>
  );
}
