"use client"

import { useState, useMemo } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react"

import {
  type SocialPost,
  PLATFORM_CONFIG,
  DAYS,
  MONTHS,
  SEASONAL_MARKERS,
  textPrimary,
  textTertiary,
} from "./social-command-center-types"
import { PostCard } from "./social-post-card"

export function ContentCalendar({
  posts,
  adminKey,
  onRefresh,
}: {
  posts: SocialPost[]
  adminKey: string
  onRefresh: () => void
}) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const seasonalMarker = SEASONAL_MARKERS[String(month + 1)]

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [year, month])

  const postsByDay = useMemo(() => {
    const map: Record<string, SocialPost[]> = {}
    posts.forEach((p) => {
      const date = p.scheduled_at || p.published_at || p.created_at
      const d = new Date(date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = String(d.getDate())
        if (!map[key]) map[key] = []
        map[key].push(p)
      }
    })
    return map
  }, [posts, year, month])

  const today = new Date()
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day

  const totalScheduled = posts.filter((p) => p.status === "scheduled").length
  const totalDraft = posts.filter((p) => p.status === "draft").length
  const totalPublished = posts.filter((p) => p.status === "published").length

  const visiblePosts = selectedDay
    ? postsByDay[selectedDay] || []
    : posts.sort((a, b) => {
        const da = a.scheduled_at || a.created_at
        const db = b.scheduled_at || b.created_at
        return new Date(da).getTime() - new Date(db).getTime()
      })

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMonth(new Date(year, month - 1))}
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--color-light-gray)]"
          >
            <ChevronLeft size={16} className={textTertiary} />
          </button>
          <h3 className={`text-lg font-semibold ${textPrimary}`}>
            {MONTHS[month]} {year}
          </h3>
          <button
            onClick={() => setViewMonth(new Date(year, month + 1))}
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--color-light-gray)]"
          >
            <ChevronRight size={16} className={textTertiary} />
          </button>
          <button
            onClick={() => setViewMonth(new Date())}
            className="text-xs px-2 py-1 rounded-lg bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${textTertiary}`}>
            {totalDraft} draft &middot; {totalScheduled} scheduled &middot;{" "}
            {totalPublished} published
          </span>
          <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--color-light-gray)]">
            <button
              onClick={() => {
                setViewMode("calendar")
                setSelectedDay(null)
              }}
              className={`p-1.5 rounded ${viewMode === "calendar" ? "bg-[var(--color-gold)] text-[var(--color-light)]" : textTertiary}`}
            >
              <CalendarDays size={14} />
            </button>
            <button
              onClick={() => {
                setViewMode("list")
                setSelectedDay(null)
              }}
              className={`p-1.5 rounded ${viewMode === "list" ? "bg-[var(--color-gold)] text-[var(--color-light)]" : textTertiary}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {seasonalMarker && (
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${seasonalMarker.color}`}
        >
          \uD83D\uDCC5 {seasonalMarker.label} \u2014 great time to post
          seasonal content
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className={`border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]`}>
          <div className="grid grid-cols-7">
            {DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium py-2 text-[var(--color-mid-gray)] border-b border-[var(--border-subtle)]"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return (
                  <div
                    key={i}
                    className="min-h-[80px] border-b border-r border-[var(--border-subtle)] bg-[var(--color-light)]/30"
                  />
                )
              }
              const dayPosts = postsByDay[String(day)] || []
              const isSelected = selectedDay === String(day)
              return (
                <div
                  key={i}
                  onClick={() =>
                    setSelectedDay(isSelected ? null : String(day))
                  }
                  className={`min-h-[80px] border-b border-r border-[var(--border-subtle)] p-1.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-[var(--color-gold)]/10" : ""
                  } ${isToday(day) ? "bg-[var(--color-gold)]/5" : ""} hover:bg-[var(--color-light-gray)]`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium ${isToday(day) ? "text-[var(--color-gold)] font-semibold" : textTertiary}`}
                    >
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[10px] px-1 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                        {dayPosts.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {dayPosts.slice(0, 4).map((p, j) => (
                      <div
                        key={j}
                        className={`w-2 h-2 rounded-full ${PLATFORM_CONFIG[p.platform].dotColor} ${p.status === "published" ? "opacity-100" : "opacity-50"}`}
                        title={`${PLATFORM_CONFIG[p.platform].label}: ${p.content.slice(0, 40)}...`}
                      />
                    ))}
                    {dayPosts.length > 4 && (
                      <span className={`text-[9px] ${textTertiary}`}>
                        +{dayPosts.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected day posts or list view */}
      {(selectedDay || viewMode === "list") && (
        <div className="space-y-2">
          {selectedDay && (
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-medium ${textPrimary}`}>
                {MONTHS[month]} {selectedDay}, {year} \u2014{" "}
                {visiblePosts.length}{" "}
                {visiblePosts.length === 1 ? "post" : "posts"}
              </h4>
              <button
                onClick={() => setSelectedDay(null)}
                className={`text-xs ${textTertiary} hover:underline`}
              >
                Clear selection
              </button>
            </div>
          )}
          {visiblePosts.length === 0 ? (
            <p
              className={`text-sm ${textTertiary} text-center py-4`}
            >
              No posts {selectedDay ? "on this day" : "this month"}. Generate
              some content!
            </p>
          ) : (
            visiblePosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                adminKey={adminKey}
                onUpdate={onRefresh}
              />
            ))
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
          <span
            key={key}
            className={`flex items-center gap-1.5 text-xs ${textTertiary}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
            {config.label}
          </span>
        ))}
        <span
          className={`flex items-center gap-1.5 text-xs ${textTertiary}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-mid-gray)] opacity-50" />{" "}
          Draft/Scheduled
        </span>
        <span
          className={`flex items-center gap-1.5 text-xs ${textTertiary}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-mid-gray)] opacity-100" />{" "}
          Published
        </span>
      </div>
    </div>
  )
}
