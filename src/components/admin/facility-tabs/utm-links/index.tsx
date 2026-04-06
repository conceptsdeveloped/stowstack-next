"use client"

import { useState, useEffect } from "react"
import { Loader2, Link2, Search } from "lucide-react"
import type { UTMLink, LandingPageOption } from "./types"
import UTMCreateForm from "./utm-create-form"
import UTMStatsBar from "./utm-stats-bar"
import UTMLinkCard from "./utm-link-card"

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
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "clicks" | "name">("date")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [formInitialValues, setFormInitialValues] = useState<{
    label: string
    landingPageId: string
    utmSource: string
    utmMedium: string
    utmCampaign: string
    utmContent: string
    utmTerm: string
  } | undefined>(undefined)

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

  const filteredLinks = links
    .filter((l) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const searchable =
          `${l.label} ${l.utm_source} ${l.utm_medium} ${l.utm_campaign || ""} ${l.utm_content || ""} ${l.utm_term || ""} ${l.landing_page_title || ""}`.toLowerCase()
        if (!searchable.includes(q)) return false
      }
      if (filterSource !== "all" && l.utm_source !== filterSource) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "clicks") return (b.click_count || 0) - (a.click_count || 0)
      if (sortBy === "name") return a.label.localeCompare(b.label)
      return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
    })

  const uniqueSources = [...new Set(links.map((l) => l.utm_source))].sort()

  const handleDelete = async (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id))
    try {
      await fetch(`/api/utm-links?id=${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      })
    } catch { /* silent */ }
  }

  const handleDuplicate = (link: UTMLink) => {
    setFormInitialValues({
      label: `${link.label} (copy)`,
      landingPageId: link.landing_page_id || "",
      utmSource: link.utm_source,
      utmMedium: link.utm_medium,
      utmCampaign: link.utm_campaign || "",
      utmContent: link.utm_content || "",
      utmTerm: link.utm_term || "",
    })
    setShowForm(true)
  }

  const toggleForm = () => {
    if (showForm) {
      setShowForm(false)
      setFormInitialValues(undefined)
    } else {
      setFormInitialValues(undefined)
      setShowForm(true)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <UTMStatsBar
        links={links}
        filteredLinks={filteredLinks}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterSource={filterSource}
        onFilterSourceChange={setFilterSource}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        uniqueSources={uniqueSources}
        showForm={showForm}
        onToggleForm={toggleForm}
      />

      {showForm && (
        <UTMCreateForm
          facilityId={facilityId}
          adminKey={adminKey}
          landingPages={landingPages}
          initialValues={formInitialValues}
          onCreated={(link) => {
            setLinks((prev) => [link as unknown as UTMLink, ...prev])
            setShowForm(false)
            setFormInitialValues(undefined)
          }}
          onCancel={() => {
            setShowForm(false)
            setFormInitialValues(undefined)
          }}
        />
      )}

      {links.length === 0 && !showForm ? (
        <div className="border-2 border-dashed border-[var(--border-subtle)] rounded-xl p-10 text-center">
          <Link2 size={28} className="mx-auto mb-2 text-[var(--color-mid-gray)]" />
          <p className="text-sm font-medium text-[var(--color-dark)]">No tracked links yet</p>
          <p className="text-xs text-[var(--color-mid-gray)] mt-1">
            Create your first UTM link to start tracking campaign performance
          </p>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-mid-gray)]">
          <Search size={20} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No links match your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLinks.map((link) => (
            <UTMLinkCard
              key={link.id}
              link={link}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
