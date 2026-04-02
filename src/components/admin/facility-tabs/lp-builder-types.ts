/* ── Shared types and constants for the Landing Page Builder ── */

export interface LPSection {
  id: string
  section_type: string
  sort_order: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>
}

export interface LandingPageRecord {
  id: string
  facility_id: string
  slug: string
  title: string
  status: string
  variation_ids?: string[]
  meta_title?: string
  meta_description?: string
  og_image_url?: string
  theme?: Record<string, string>
  storedge_widget_url?: string
  sections?: LPSection[]
  created_at: string
  updated_at: string
  published_at?: string
}

export const SECTION_TYPE_META: Record<
  string,
  { label: string; icon: string; defaultConfig: Record<string, unknown> }
> = {
  hero: {
    label: "Hero",
    icon: "H",
    defaultConfig: {
      headline: "",
      subheadline: "",
      ctaText: "Reserve Now",
      ctaUrl: "#cta",
      badgeText: "",
      style: "dark",
    },
  },
  trust_bar: {
    label: "Trust Bar",
    icon: "T",
    defaultConfig: { items: [{ icon: "check", text: "" }] },
  },
  features: {
    label: "Features",
    icon: "F",
    defaultConfig: {
      headline: "",
      items: [{ icon: "check", title: "", desc: "" }],
    },
  },
  unit_types: {
    label: "Unit Types",
    icon: "U",
    defaultConfig: {
      headline: "Available Units",
      units: [{ name: "", size: "", price: "", features: [] }],
    },
  },
  gallery: {
    label: "Photo Gallery",
    icon: "G",
    defaultConfig: { headline: "Our Facility", images: [] },
  },
  testimonials: {
    label: "Testimonials",
    icon: "R",
    defaultConfig: {
      headline: "What Our Customers Say",
      items: [{ name: "", text: "", role: "", metric: "" }],
    },
  },
  faq: {
    label: "FAQ",
    icon: "Q",
    defaultConfig: {
      headline: "Frequently Asked Questions",
      items: [{ q: "", a: "" }],
    },
  },
  cta: {
    label: "Call to Action",
    icon: "C",
    defaultConfig: {
      headline: "",
      subheadline: "",
      ctaText: "Reserve Your Unit",
      ctaUrl: "#",
      phone: "",
      style: "gradient",
    },
  },
  location_map: {
    label: "Location & Map",
    icon: "M",
    defaultConfig: { headline: "Find Us", address: "", directions: "" },
  },
}

export const PAGE_TEMPLATES: Record<
  string,
  { label: string; desc: string; sectionTypes: string[] }
> = {
  standard: {
    label: "Standard",
    desc: "Hero + Trust Bar + Features + Gallery + CTA",
    sectionTypes: ["hero", "trust_bar", "features", "gallery", "cta"],
  },
  minimal: {
    label: "Minimal",
    desc: "Hero + CTA -- quick and simple",
    sectionTypes: ["hero", "cta"],
  },
  full: {
    label: "Full",
    desc: "All 9 sections -- the works",
    sectionTypes: [
      "hero",
      "trust_bar",
      "features",
      "unit_types",
      "gallery",
      "testimonials",
      "faq",
      "cta",
      "location_map",
    ],
  },
  custom: {
    label: "Blank",
    desc: "Start from scratch",
    sectionTypes: [],
  },
}

export const INPUT_CLS =
  "w-full h-9 px-3 rounded-lg text-sm outline-none transition-all bg-[#F9FAFB] border border-black/[0.08] text-[#111827] focus:border-[#3B82F6]/50 placeholder:text-[#9CA3AF]"

export const TEXTAREA_CLS =
  "w-full px-3 py-2 rounded-lg text-sm outline-none transition-all resize-none bg-[#F9FAFB] border border-black/[0.08] text-[#111827] focus:border-[#3B82F6]/50 placeholder:text-[#9CA3AF]"
