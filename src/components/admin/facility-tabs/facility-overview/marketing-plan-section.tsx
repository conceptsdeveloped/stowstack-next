"use client"

import { useState } from "react"
import {
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react"
import { PLAYBOOK_OPTIONS } from "./types"

export function SeasonalPlaybooks({
  selectedPlaybooks,
  onTogglePlaybook,
}: {
  selectedPlaybooks: string[]
  onTogglePlaybook: (id: string) => void
}) {
  const [showPlaybooks, setShowPlaybooks] = useState(false)

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
      <button
        onClick={() => setShowPlaybooks(!showPlaybooks)}
        className="w-full px-5 py-4 flex items-center justify-between"
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[var(--color-gold)]" />
            <h4 className="text-sm font-semibold text-[var(--color-dark)]">
              Seasonal Playbooks
            </h4>
          </div>
          <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">
            {selectedPlaybooks.length
              ? `${selectedPlaybooks.length} playbook${selectedPlaybooks.length !== 1 ? "s" : ""} selected`
              : "Assign seasonal strategies to include in the marketing plan"}
          </p>
        </div>
        {showPlaybooks ? (
          <ChevronUp size={14} className="text-[var(--color-mid-gray)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--color-mid-gray)]" />
        )}
      </button>
      {showPlaybooks && (
        <div className="px-5 pb-4 border-t border-[var(--border-subtle)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-3">
            {PLAYBOOK_OPTIONS.map((pb) => {
              const isSelected = selectedPlaybooks.includes(pb.id)
              return (
                <button
                  key={pb.id}
                  onClick={() => onTogglePlaybook(pb.id)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    isSelected
                      ? "bg-[var(--color-gold)]/10 text-[var(--color-blue)] border-[var(--color-gold)]/30"
                      : "border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] hover:text-[var(--color-dark)]"
                  }`}
                >
                  <p className="text-xs font-medium">{pb.label}</p>
                  <p
                    className={`text-[10px] mt-0.5 ${isSelected ? "text-[var(--color-gold)]/70" : "text-[var(--color-mid-gray)]"}`}
                  >
                    {pb.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function GeneratePlanButton({
  generating,
  hasPlan,
  onGenerate,
}: {
  generating: boolean
  hasPlan: boolean
  onGenerate: () => void
}) {
  return (
    <div>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-semibold rounded-xl hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
      >
        {generating ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Generating
            Marketing Plan...
          </>
        ) : (
          <>
            <Sparkles size={16} />{" "}
            {hasPlan ? "Regenerate Marketing Plan" : "Generate Marketing Plan"}
          </>
        )}
      </button>
      <p className="text-[10px] text-[var(--color-mid-gray)] text-center mt-2">
        Uses facility data, business context, reviews, playbooks, and spend
        analysis
      </p>
    </div>
  )
}
