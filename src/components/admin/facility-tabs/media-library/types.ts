export interface Asset {
  id: string
  facility_id: string
  created_at: string
  type: string
  source: string
  url: string
  metadata: Record<string, unknown> | null
}

export interface StockImage {
  id: string
  url: string
  alt: string
  category: string
}

export interface ScrapeResult {
  images?: { url: string; alt: string }[]
  videos?: { url: string; type: string }[]
  contact?: { phones: string[]; emails: string[] }
  headings?: string[]
  pagesScraped?: number
  pagesCrawled?: string[]
  pageCopy?: string[]
  services?: { heading?: string; description?: string }[]
  promotions?: { text: string }[]
}

export const STOCK_CATEGORIES = [
  "all",
  "exterior",
  "interior",
  "moving",
  "packing",
  "lifestyle",
  "vehicle",
] as const

export const IMAGE_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "photo", label: "Photos" },
  { value: "logo", label: "Logos" },
  { value: "brand", label: "Brand" },
  { value: "scrape", label: "Scraped" },
] as const
