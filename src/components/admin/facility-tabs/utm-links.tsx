"use client"

import { useState, useEffect } from "react"
import {
  Loader2,
  Plus,
  Search,
  Download,
  Link2,
  Copy,
  ExternalLink,
  ClipboardList,
  Trash2,
  MousePointerClick,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"

interface UTMLink {
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

interface LandingPageOption {
  id: string
  title: string
  slug: string
  status: string
}

export default function UTMLinks({
  facilityId,
  adminKey,
}: {
  facilityId: string
  adminKey: string
}) {
  const [links, setLinks] = useState<UTMLink[]>([])
  const [landingPages, setLandingPages] = useState<LandingPageOption[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedType, setCopiedType] = useState<
    "tracking" | "destination" | null
  >(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "clicks" | "name">("date")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [label, setLabel] = useState("")
  const [landingPageId, setLandingPageId] = useState("")
  const [utmSource, setUtmSource] = useState("meta")
  const [utmMedium, setUtmMedium] = useState("paid_social")
  const [utmCampaign, setUtmCampaign] = useState("")
  const [utmContent, setUtmContent] = useState("")
  const [utmTerm, setUtmTerm] = useState("")

  const inputCls =
    "w-full px-3 py-2 rounded-lg border text-sm bg-[#0A0A0A] border-white/[0.06] text-[#F5F5F7] placeholder:text-[#6E6E73] focus:border-[#3B82F6]/50 outline-none transition-all"
  const selectCls = inputCls

  const BASE_URL =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://stowstack.co"
  const PROD_URL = "https://stowstack.co"

  useEffect(() => {
    Promise.all([
      fetch(`/api/utm-links?facilityId=${facilityId}`, {
        headers: { "X-Admin-Key": adminKey },
      }).then((r) => r.json()),
      fetch(`/api/landing-pages?facilityId=${facilityId}`, {
        headers: { "X-Admin-Key": adminKey },
      }).then((r) => r.json()),
    ])
      .then(([linksData, pagesData]) => {
        if (linksData.links) setLinks(linksData.links)
        if (pagesData.pages) setLandingPages(pagesData.pages)
        else if (pagesData.data) setLandingPages(pagesData.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [facilityId, adminKey])

  const selectedPage = landingPages.find((p) => p.id === landingPageId)

  const buildDestinationUrl = (link: UTMLink) => {
    let dest = PROD_URL
    if (link.landing_page_slug)
      dest = `${PROD_URL}/lp/${link.landing_page_slug}`
    const params = new URLSearchParams()
    if (link.utm_source) params.set("utm_source", link.utm_source)
    if (link.utm_medium) params.set("utm_medium", link.utm_medium)
    if (link.utm_campaign) params.set("utm_campaign", link.utm_campaign)
    if (link.utm_content) params.set("utm_content", link.utm_content)
    if (link.utm_term) params.set("utm_term", link.utm_term)
    const qs = params.toString()
    return qs ? `${dest}?${qs}` : dest
  }

  const buildPreviewUrl = () => {
    let dest = BASE_URL
    if (selectedPage) dest = `${BASE_URL}/lp/${selectedPage.slug}`
    const params = new URLSearchParams()
    if (utmSource) params.set("utm_source", utmSource)
    if (utmMedium) params.set("utm_medium", utmMedium)
    if (utmCampaign) params.set("utm_campaign", utmCampaign)
    if (utmContent) params.set("utm_content", utmContent)
    if (utmTerm) params.set("utm_term", utmTerm)
    const qs = params.toString()
    return qs ? `${dest}?${qs}` : dest
  }

  const filteredLinks = links
    .filter((l) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const searchable =
          `${l.label} ${l.utm_source} ${l.utm_medium} ${l.utm_campaign || ""} ${l.utm_content || ""} ${l.utm_term || ""} ${l.landing_page_title || ""}`.toLowerCase()
        if (!searchable.includes(q)) return false
      }
      if (filterSource !== "all" && l.utm_source !== filterSource)
        return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "clicks")
        return (b.click_count || 0) - (a.click_count || 0)
      if (sortBy === "name") return a.label.localeCompare(b.label)
      return (
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
      )
    })

  const uniqueSources = [...new Set(links.map((l) => l.utm_source))].sort()

  const totalClicks = links.reduce(
    (sum, l) => sum + (l.click_count || 0),
    0
  )
  const topLink = links.length
    ? links.reduce(
        (top, l) =>
          (l.click_count || 0) > (top.click_count || 0) ? l : top,
        links[0]
      )
    : null

  const resetForm = () => {
    setLabel("")
    setLandingPageId("")
    setUtmSource("meta")
    setUtmMedium("paid_social")
    setUtmCampaign("")
    setUtmContent("")
    setUtmTerm("")
  }

  const prefillForm = (link: UTMLink) => {
    setLabel(`${link.label} (copy)`)
    setLandingPageId(link.landing_page_id || "")
    setUtmSource(link.utm_source)
    setUtmMedium(link.utm_medium)
    setUtmCampaign(link.utm_campaign || "")
    setUtmContent(link.utm_content || "")
    setUtmTerm(link.utm_term || "")
    setShowForm(true)
  }

  const handleCreate = async () => {
    if (!label.trim() || !utmSource || !utmMedium) return
    setCreating(true)
    try {
      const res = await fetch("/api/utm-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId,
          landingPageId: landingPageId || undefined,
          label: label.trim(),
          utmSource,
          utmMedium,
          utmCampaign: utmCampaign || undefined,
          utmContent: utmContent || undefined,
          utmTerm: utmTerm || undefined,
        }),
      })
      const data = await res.json()
      if (data.link) {
        setLinks((prev) => [data.link, ...prev])
        resetForm()
        setShowForm(false)
      }
    } catch {
      /* silent */
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id))
    try {
      await fetch(`/api/utm-links?id=${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      })
    } catch {
      /* silent */
    }
  }

  const copyToClipboard = (
    val: string,
    linkId: string,
    type: "tracking" | "destination"
  ) => {
    navigator.clipboard.writeText(val)
    setCopiedId(linkId)
    setCopiedType(type)
    setTimeout(() => {
      setCopiedId(null)
      setCopiedType(null)
    }, 2000)
  }

  const exportCSV = () => {
    const headers = [
      "Label",
      "Landing Page",
      "Source",
      "Medium",
      "Campaign",
      "Content",
      "Term",
      "Tracking URL",
      "Destination URL",
      "Clicks",
      "Created",
      "Last Click",
    ]
    const rows = filteredLinks.map((l) => [
      l.label,
      l.landing_page_title || "Homepage",
      l.utm_source,
      l.utm_medium,
      l.utm_campaign || "",
      l.utm_content || "",
      l.utm_term || "",
      `${PROD_URL}/api/r?c=${l.short_code}`,
      buildDestinationUrl(l),
      l.click_count || 0,
      new Date(l.created_at || "").toLocaleDateString(),
      l.last_clicked_at
        ? new Date(l.last_clicked_at).toLocaleDateString()
        : "",
    ])
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `utm-links-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#F5F5F7]">
            UTM Link Builder
          </h3>
          <p className="text-xs text-[#6E6E73]">
            Create tracked links for campaigns and measure click-through
            performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {links.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-white/[0.06] text-[#A1A1A6] hover:bg-white/[0.06] transition-colors"
              title="Export links as CSV"
            >
              <Download size={14} />
              CSV
            </button>
          )}
          <button
            onClick={() => {
              setShowForm(!showForm)
              if (showForm) resetForm()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#3B82F6]/90 transition-colors"
          >
            <Plus size={14} />
            New Link
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {links.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-white/[0.06] rounded-lg p-3 bg-[#111111]">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6E6E73]">
              Total Links
            </p>
            <p className="text-lg font-bold text-[#F5F5F7]">
              {links.length}
            </p>
          </div>
          <div className="border border-white/[0.06] rounded-lg p-3 bg-[#111111]">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6E6E73]">
              Total Clicks
            </p>
            <p className="text-lg font-bold text-[#F5F5F7]">
              {totalClicks}
            </p>
          </div>
          <div className="border border-white/[0.06] rounded-lg p-3 bg-[#111111]">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6E6E73]">
              Top Performer
            </p>
            <p className="text-sm font-semibold text-[#F5F5F7] truncate">
              {topLink && (topLink.click_count || 0) > 0
                ? topLink.label
                : "--"}
            </p>
            {topLink && (topLink.click_count || 0) > 0 && (
              <p className="text-xs text-[#6E6E73]">
                {topLink.click_count} clicks
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search + filter + sort bar */}
      {links.length > 1 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73]"
              />
              <input
                className={`${inputCls} pl-8`}
                placeholder="Search links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <select
            className={`px-3 py-2 rounded-lg border text-sm bg-[#0A0A0A] border-white/[0.06] text-[#F5F5F7] outline-none`}
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">All sources</option>
            {uniqueSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className={`px-3 py-2 rounded-lg border text-sm bg-[#0A0A0A] border-white/[0.06] text-[#F5F5F7] outline-none`}
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "date" | "clicks" | "name")
            }
          >
            <option value="date">Newest first</option>
            <option value="clicks">Most clicks</option>
            <option value="name">A-Z</option>
          </select>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="border border-white/[0.06] rounded-xl p-5 space-y-4 bg-[#111111]">
          <p className="text-sm font-medium text-[#F5F5F7]">
            Create Tracked Link
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Label *
              </label>
              <input
                className={inputCls}
                placeholder="e.g. March FB campaign"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Landing Page
              </label>
              <select
                className={selectCls}
                value={landingPageId}
                onChange={(e) => setLandingPageId(e.target.value)}
              >
                <option value="">Homepage (stowstack.co)</option>
                {landingPages
                  .filter((p) => p.status === "published")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Source *
              </label>
              <select
                className={selectCls}
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
              >
                <option value="meta">Meta</option>
                <option value="google">Google</option>
                <option value="tiktok">TikTok</option>
                <option value="email">Email</option>
                <option value="direct_mail">Direct Mail</option>
                <option value="direct">Direct</option>
                <option value="referral">Referral</option>
                <option value="organic">Organic</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Medium *
              </label>
              <select
                className={selectCls}
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
              >
                <option value="paid_social">paid_social</option>
                <option value="cpc">cpc</option>
                <option value="cpm">cpm</option>
                <option value="social">social</option>
                <option value="email">email</option>
                <option value="print">print</option>
                <option value="referral">referral</option>
                <option value="organic">organic</option>
                <option value="display">display</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Campaign
              </label>
              <input
                className={inputCls}
                placeholder="spring-promo"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Content (A/B testing)
              </label>
              <input
                className={inputCls}
                placeholder="hero-cta-v2"
                value={utmContent}
                onChange={(e) => setUtmContent(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1">
                Term (keywords)
              </label>
              <input
                className={inputCls}
                placeholder="storage+units"
                value={utmTerm}
                onChange={(e) => setUtmTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Live URL preview */}
          <div>
            <label className="block text-xs font-medium text-[#6E6E73] mb-1">
              Destination Preview
            </label>
            <div className="p-3 rounded-lg text-xs font-mono break-all bg-[#0A0A0A] text-[#3B82F6] border border-white/[0.06]">
              {buildPreviewUrl()}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !label.trim() || !utmSource || !utmMedium}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#3B82F6]/90 disabled:opacity-50 transition-colors"
            >
              {creating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Link2 size={14} />
              )}
              Create Link
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="px-4 py-2 text-sm rounded-lg text-[#6E6E73] hover:text-[#F5F5F7]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Links list */}
      {links.length === 0 && !showForm ? (
        <div className="border-2 border-dashed border-white/[0.06] rounded-xl p-10 text-center">
          <Link2 size={28} className="mx-auto mb-2 text-[#6E6E73]" />
          <p className="text-sm font-medium text-[#F5F5F7]">
            No tracked links yet
          </p>
          <p className="text-xs text-[#6E6E73] mt-1">
            Create your first UTM link to start tracking campaign performance
          </p>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="text-center py-8 text-[#6E6E73]">
          <Search size={20} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No links match your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLinks.map((link) => {
            const trackingUrl = `${PROD_URL}/api/r?c=${link.short_code}`
            const destinationUrl = buildDestinationUrl(link)
            const isExpanded = expandedId === link.id

            return (
              <div
                key={link.id}
                className="border border-white/[0.06] rounded-xl bg-[#111111] transition-all"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : link.id)
                          }
                          className="flex items-center gap-1.5"
                        >
                          <ChevronRight
                            size={14}
                            className={`transition-transform text-[#6E6E73] ${isExpanded ? "rotate-90" : ""}`}
                          />
                          <p className="text-sm font-medium text-[#F5F5F7]">
                            {link.label}
                          </p>
                        </button>
                        {link.landing_page_title && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#A1A1A6]">
                            {link.landing_page_title}
                          </span>
                        )}
                      </div>

                      {/* UTM params badges */}
                      <div className="flex flex-wrap gap-1.5 mb-2 ml-5">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                          {link.utm_source}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#3B82F6]/10 text-[#3B82F6]">
                          {link.utm_medium}
                        </span>
                        {link.utm_campaign && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                            {link.utm_campaign}
                          </span>
                        )}
                        {link.utm_content && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                            {link.utm_content}
                          </span>
                        )}
                        {link.utm_term && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                            {link.utm_term}
                          </span>
                        )}
                      </div>

                      {/* Tracking URL */}
                      <div className="text-xs font-mono text-[#6E6E73] truncate ml-5">
                        {trackingUrl}
                      </div>
                    </div>

                    {/* Stats + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right mr-1">
                        <div className="flex items-center gap-1">
                          <MousePointerClick
                            size={13}
                            className="text-[#6E6E73]"
                          />
                          <span className="text-sm font-semibold text-[#F5F5F7]">
                            {link.click_count || 0}
                          </span>
                        </div>
                        <p className="text-xs text-[#6E6E73]">clicks</p>
                      </div>

                      <button
                        onClick={() =>
                          copyToClipboard(trackingUrl, link.id, "tracking")
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          copiedId === link.id &&
                          copiedType === "tracking"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "hover:bg-white/[0.06] text-[#6E6E73]"
                        }`}
                        title="Copy tracking URL (with click counter)"
                      >
                        {copiedId === link.id &&
                        copiedType === "tracking" ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>

                      <button
                        onClick={() =>
                          copyToClipboard(
                            destinationUrl,
                            link.id,
                            "destination"
                          )
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          copiedId === link.id &&
                          copiedType === "destination"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "hover:bg-white/[0.06] text-[#6E6E73]"
                        }`}
                        title="Copy direct destination URL (no redirect)"
                      >
                        {copiedId === link.id &&
                        copiedType === "destination" ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <ExternalLink size={15} />
                        )}
                      </button>

                      <button
                        onClick={() => prefillForm(link)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06] text-[#6E6E73]"
                        title="Duplicate link"
                      >
                        <ClipboardList size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(link.id)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-[#6E6E73] hover:text-red-400"
                        title="Delete link"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="flex gap-4 mt-2 text-xs text-[#6E6E73] ml-5">
                    <span>
                      Created{" "}
                      {new Date(
                        link.created_at || ""
                      ).toLocaleDateString()}
                    </span>
                    {link.last_clicked_at && (
                      <span>
                        Last click{" "}
                        {new Date(
                          link.last_clicked_at
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded panel: full URLs + short code + QR code */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] px-4 py-3 space-y-3 bg-[#0A0A0A]/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* URLs */}
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-[#6E6E73] mb-1">
                            Tracking URL (counts clicks)
                          </p>
                          <div className="p-2 rounded text-xs font-mono break-all bg-[#0A0A0A] text-[#A1A1A6] border border-white/[0.06]">
                            {trackingUrl}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#6E6E73] mb-1">
                            Destination URL (direct, no tracking)
                          </p>
                          <div className="p-2 rounded text-xs font-mono break-all bg-[#0A0A0A] text-[#A1A1A6] border border-white/[0.06]">
                            {destinationUrl}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#6E6E73] mb-1">
                            Short Code
                          </p>
                          <div className="p-2 rounded text-xs font-mono bg-[#0A0A0A] text-[#3B82F6] border border-white/[0.06]">
                            {link.short_code}
                          </div>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-xs font-medium text-[#6E6E73]">
                          QR Code (for print / signage)
                        </p>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}&bgcolor=ffffff&color=000000&margin=8`}
                          alt="QR Code"
                          className="w-[120px] h-[120px] rounded border bg-white p-1"
                          style={{ imageRendering: "pixelated" }}
                        />
                        <a
                          href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(trackingUrl)}&bgcolor=ffffff&color=000000&margin=16&format=png`}
                          download={`qr-${link.short_code}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 text-[#3B82F6] hover:text-[#3B82F6]/80"
                        >
                          <Download size={12} />
                          Download high-res QR
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
