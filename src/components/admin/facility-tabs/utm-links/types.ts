export interface UTMLink {
  id: string
  short_code: string
  label: string
  landing_page_id?: string
  landing_page_slug?: string
  landing_page_title?: string
  utm_source: string
  utm_medium: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  clicks?: number
  created_at?: string
  click_count?: number
  last_clicked_at?: string
  status?: string
  title?: string
  slug?: string
}

export interface LandingPageOption {
  id: string
  title: string
  slug: string
  status: string
}
