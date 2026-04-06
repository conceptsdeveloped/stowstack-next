"use client"

import { useState } from "react"
import {
  Target,
  DollarSign,
  TrendingUp,
  Calendar,
  Zap,
} from "lucide-react"
import { CollapsibleSection } from "./shared-ui"
import { BUDGET_TIER_COLORS, type MarketingPlan } from "./types"

export function MarketingPlanDisplay({
  plan,
  allPlans,
  onSelectVersion,
}: {
  plan: MarketingPlan
  allPlans: MarketingPlan[]
  onSelectVersion: (planId: string) => void
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "summary"
  )

  const p = plan.plan_json

  function toggleSection(id: string) {
    setExpandedSection((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-3">
      {/* Plan header with version selector */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--color-dark)]">
          Marketing Plan v{plan.version}
        </h4>
        <div className="flex items-center gap-3">
          {allPlans.length > 1 && (
            <select
              value={plan.id}
              onChange={(e) => onSelectVersion(e.target.value)}
              className="text-[10px] px-2 py-1 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded text-[var(--color-body-text)] focus:outline-none"
            >
              {allPlans.map((ap) => (
                <option key={ap.id} value={ap.id}>
                  v{ap.version} —{" "}
                  {new Date(ap.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}
          <span className="text-[10px] text-[var(--color-mid-gray)]">
            {new Date(plan.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Spend Recommendation Banner */}
      {plan.spend_recommendation && (
        <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign size={16} className="text-emerald-400" />
            <h5 className="text-sm font-semibold text-[var(--color-dark)]">
              Ad Spend Recommendation
            </h5>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                BUDGET_TIER_COLORS[
                  plan.spend_recommendation.budgetTier
                ] || ""
              }`}
            >
              {plan.spend_recommendation.budgetTier}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <p className="text-[10px] uppercase text-[var(--color-mid-gray)]">
                Monthly Budget
              </p>
              <p className="text-lg font-semibold text-[var(--color-dark)]">
                $
                {plan.spend_recommendation.monthlyBudget.min.toLocaleString()}{" "}
                - $
                {plan.spend_recommendation.monthlyBudget.max.toLocaleString()}
              </p>
            </div>
            {Object.entries(plan.spend_recommendation.channels).map(
              ([ch, pct]) => (
                <div key={ch}>
                  <p className="text-[10px] uppercase text-[var(--color-mid-gray)]">
                    {ch.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm font-semibold text-[var(--color-dark)]">
                    {pct}%
                  </p>
                </div>
              )
            )}
          </div>
          {plan.spend_recommendation.reasoning?.length > 0 && (
            <div className="space-y-1">
              {plan.spend_recommendation.reasoning.map(
                (r: string, i: number) => (
                  <p key={i} className="text-xs text-[var(--color-body-text)]">
                    &bull; {r}
                  </p>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {p.summary && (
        <div className="p-4 rounded-xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20">
          <p className="text-sm text-[var(--color-dark)] leading-relaxed">
            {p.summary}
          </p>
        </div>
      )}

      {/* Bottleneck Analysis */}
      {p.bottleneck_analysis && (
        <CollapsibleSection
          id="bottleneck"
          title="Bottleneck Analysis"
          icon={Target}
          expandedSection={expandedSection}
          onToggle={toggleSection}
        >
          <p className="text-sm text-[var(--color-dark)] mt-3 leading-relaxed">
            {p.bottleneck_analysis}
          </p>
        </CollapsibleSection>
      )}

      {/* Strategic Rationale */}
      {p.strategic_rationale && p.strategic_rationale.length > 0 && (
        <CollapsibleSection
          id="rationale"
          title="Strategic Rationale"
          icon={Zap}
          expandedSection={expandedSection}
          onToggle={toggleSection}
        >
          <div className="mt-3 space-y-3">
            {p.strategic_rationale.map((r, i) => (
              <p
                key={i}
                className="text-sm text-[var(--color-dark)] leading-relaxed"
              >
                {r}
              </p>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Target Audiences */}
      {p.target_audiences && p.target_audiences.length > 0 && (
        <CollapsibleSection
          id="audiences"
          title={`Target Audiences (${p.target_audiences.length})`}
          icon={Target}
          expandedSection={expandedSection}
          onToggle={toggleSection}
        >
          <div className="mt-3 space-y-3">
            {p.target_audiences.map((a, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
              >
                <p className="text-sm font-semibold text-[var(--color-dark)]">
                  {a.segment}
                </p>
                <p className="text-xs text-[var(--color-body-text)] mt-1">
                  {a.description}
                </p>
                <p className="text-xs text-[var(--color-dark)] mt-1">
                  <span className="text-[var(--color-mid-gray)]">Angle:</span>{" "}
                  {a.messaging_angle}
                </p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {a.channels.map((ch) => (
                    <span
                      key={ch}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Messaging Pillars */}
      {p.messaging_pillars && p.messaging_pillars.length > 0 && (
        <CollapsibleSection
          id="messaging"
          title={`Messaging Pillars (${p.messaging_pillars.length})`}
          icon={Target}
          expandedSection={expandedSection}
          onToggle={toggleSection}
        >
          <div className="mt-3 space-y-3">
            {p.messaging_pillars.map((m, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
              >
                <p className="text-sm font-semibold text-[var(--color-dark)]">
                  {m.pillar}
                </p>
                <p className="text-xs text-[var(--color-body-text)] mt-1">
                  {m.rationale}
                </p>
                <p className="text-xs italic text-[var(--color-dark)] mt-1">
                  &ldquo;{m.example_headline}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Channel Strategy */}
      {p.channel_strategy && p.channel_strategy.length > 0 && (
        <CollapsibleSection
          id="channels"
          title="Channel Strategy"
          icon={TrendingUp}
          expandedSection={expandedSection}
          onToggle={toggleSection}
        >
          <div className="mt-3 space-y-3">
            {p.channel_strategy.map((ch, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-[var(--color-dark)]">
                    {ch.channel}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-blue)] font-semibold">
                    {ch.budget_pct}%
                  </span>
                </div>
                <p className="text-xs text-[var(--color-body-text)]">{ch.objective}</p>
                <ul className="text-xs text-[var(--color-dark)] mt-1.5 space-y-0.5">
                  {ch.tactics.map((t, j) => (
                    <li key={j}>&bull; {t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Content Calendar */}
      {p.content_calendar && p.content_calendar.length > 0 && (
        <CollapsibleSection
          id="calendar"
          title="Content Calendar"
          icon={Calendar}
          expandedSection={expandedSection}
          onToggle={toggleSection}
        >
          <div className="mt-3 space-y-2">
            {p.content_calendar.map((w, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--color-light-gray)]">
                  <span className="text-xs font-semibold text-[var(--color-dark)]">
                    W{w.week}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-dark)]">
                    {w.focus}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.deliverables.map((d, j) => (
                      <span
                        key={j}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-blue)]"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* KPIs & Targets */}
      {p.kpis && p.kpis.length > 0 && (
        <CollapsibleSection
          id="kpis"
          title="KPIs & Targets"
          icon={TrendingUp}
          expandedSection={expandedSection}
          onToggle={toggleSection}
        >
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {p.kpis.map((kpi, i) => (
              <div
                key={i}
                className="p-3 rounded-lg text-center bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
              >
                <p className="text-lg font-semibold text-[var(--color-dark)]">
                  {kpi.target}
                </p>
                <p className="text-[10px] uppercase text-[var(--color-mid-gray)]">
                  {kpi.metric}
                </p>
                <p className="text-[10px] text-[var(--color-mid-gray)]">
                  {kpi.timeframe}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Quick Wins */}
      {p.quick_wins && p.quick_wins.length > 0 && (
        <CollapsibleSection
          id="quick-wins"
          title={`Quick Wins (${p.quick_wins.length})`}
          icon={Zap}
          expandedSection={expandedSection}
          onToggle={toggleSection}
        >
          <div className="mt-3 space-y-1.5">
            {p.quick_wins.map((win, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-[var(--color-dark)]"
              >
                <Zap
                  size={12}
                  className="text-amber-400 mt-0.5 flex-shrink-0"
                />
                <span>{win}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
