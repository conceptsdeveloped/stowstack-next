"use client"

import { useState } from "react"
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
} from "lucide-react"
import {
  type GBPQuestion,
  type GBPConnection,
  type QAStats,
  card,
  textPrimary,
  textSecondary,
  textTertiary,
  inputCls,
  btnPrimary,
  btnSecondary,
  formatDate,
  responseStatusColors,
  chipClass,
} from "./gbp-shared"

interface GBPQAProps {
  facilityId: string
  adminKey: string
  questions: GBPQuestion[]
  setQuestions: React.Dispatch<React.SetStateAction<GBPQuestion[]>>
  qaStats: QAStats
  connection: GBPConnection | null
  loadAll: () => Promise<void>
  syncing: string | null
  setSyncing: React.Dispatch<React.SetStateAction<string | null>>
}

export default function GBPQA({
  facilityId,
  adminKey,
  questions,
  setQuestions,
  qaStats,
  connection,
  loadAll,
  syncing,
  setSyncing,
}: GBPQAProps) {
  const [generatingAnswer, setGeneratingAnswer] = useState<string | null>(null)
  const [editingAnswer, setEditingAnswer] = useState<Record<string, string>>({})
  const [approvingAnswer, setApprovingAnswer] = useState<string | null>(null)
  const [bulkGeneratingQA, setBulkGeneratingQA] = useState(false)
  const [qaFilter, setQaFilter] = useState("all")

  // ── Q&A actions ──

  async function syncQuestions() {
    setSyncing("qa")
    try {
      await fetch("/api/gbp-questions?action=sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId }),
      })
      await loadAll()
    } catch {
      /* silent */
    }
    setSyncing(null)
  }

  async function generateAIAnswer(questionId: string) {
    setGeneratingAnswer(questionId)
    try {
      const res = await fetch("/api/gbp-questions?action=generate-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ questionId }),
      })
      const data = await res.json()
      if (data.aiDraft) {
        setEditingAnswer((prev) => ({ ...prev, [questionId]: data.aiDraft }))
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? { ...q, ai_draft: data.aiDraft, answer_status: "ai_drafted" }
              : q
          )
        )
      }
    } catch {
      /* silent */
    }
    setGeneratingAnswer(null)
  }

  async function bulkGenerateAnswers() {
    setBulkGeneratingQA(true)
    try {
      const res = await fetch("/api/gbp-questions?action=bulk-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId }),
      })
      if (res.ok) await loadAll()
    } catch {
      /* silent */
    }
    setBulkGeneratingQA(false)
  }

  async function approveAnswer(questionId: string) {
    const answerText = editingAnswer[questionId]
    if (!answerText?.trim()) return
    setApprovingAnswer(questionId)
    try {
      await fetch("/api/gbp-questions?action=approve-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ questionId, answerText }),
      })
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answer_status: "published", answer_text: answerText }
            : q
        )
      )
      setEditingAnswer((prev) => {
        const n = { ...prev }
        delete n[questionId]
        return n
      })
    } catch {
      /* silent */
    }
    setApprovingAnswer(null)
  }

  // ── Derived data ──

  const filteredQuestions =
    qaFilter === "all"
      ? questions
      : qaFilter === "unanswered"
        ? questions.filter(
            (q) =>
              q.answer_status === "pending" || q.answer_status === "ai_drafted"
          )
        : questions.filter((q) => q.answer_status === qaFilter)

  const pendingQACount = questions.filter(
    (q) => q.answer_status === "pending"
  ).length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Questions",
            value: qaStats.total,
            icon: HelpCircle,
          },
          {
            label: "Answered",
            value: qaStats.answered,
            icon: CheckCircle2,
          },
          {
            label: "Unanswered",
            value: qaStats.unanswered,
            icon: AlertCircle,
          },
        ].map((stat) => (
          <div key={stat.label} className={card + " p-4"}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon size={14} className={textTertiary} />
              <span className={`text-xs font-medium ${textTertiary}`}>
                {stat.label}
              </span>
            </div>
            <p className={`text-xl font-semibold ${textPrimary}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {["all", "unanswered", "published"].map((f) => (
            <button
              key={f}
              onClick={() => setQaFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                qaFilter === f
                  ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                  : "text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
              }`}
            >
              {f === "all"
                ? "All"
                : f === "unanswered"
                  ? "Needs Answer"
                  : "Answered"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {pendingQACount > 0 && (
            <button
              onClick={bulkGenerateAnswers}
              disabled={bulkGeneratingQA}
              className={btnSecondary}
            >
              {bulkGeneratingQA ? (
                <Loader2
                  size={13}
                  className="inline animate-spin mr-1"
                />
              ) : (
                <Sparkles size={13} className="inline mr-1" />
              )}
              AI Draft All ({pendingQACount})
            </button>
          )}
          {connection?.status === "connected" && (
            <button
              onClick={syncQuestions}
              disabled={syncing === "qa"}
              className={btnSecondary}
            >
              {syncing === "qa" ? (
                <Loader2
                  size={13}
                  className="inline animate-spin mr-1"
                />
              ) : (
                <RefreshCw size={13} className="inline mr-1" />
              )}
              Sync Q&A
            </button>
          )}
        </div>
      </div>

      {filteredQuestions.length === 0 ? (
        <div className={card + " p-8 text-center"}>
          <HelpCircle
            size={32}
            className={`mx-auto mb-2 opacity-40 ${textTertiary}`}
          />
          <p className={`text-sm ${textSecondary}`}>
            No questions{" "}
            {qaFilter !== "all" ? "matching this filter" : "yet"}.
          </p>
          {connection?.status === "connected" && (
            <p className={`text-xs mt-1 ${textTertiary}`}>
              Click &quot;Sync Q&A&quot; to pull questions from GBP.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <div key={q.id} className={card + " p-4"}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-blue)]/10">
                  <HelpCircle
                    size={14}
                    className="text-[var(--color-blue)]"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-sm font-medium ${textPrimary}`}
                    >
                      {q.author_name || "Anonymous"}
                    </span>
                    <span
                      className={chipClass(
                        q.answer_status,
                        responseStatusColors
                      )}
                    >
                      {q.answer_status.replace(/_/g, " ")}
                    </span>
                    <span className={`text-xs ${textTertiary}`}>
                      {formatDate(q.question_time)}
                    </span>
                    {q.upvote_count > 0 && (
                      <span className={`text-xs ${textTertiary}`}>
                        +{q.upvote_count} upvotes
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${textPrimary} mb-2`}>
                    {q.question_text}
                  </p>

                  {q.answer_status === "published" && q.answer_text && (
                    <div className="p-3 rounded-lg text-sm bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xs font-medium mb-1 text-emerald-400">
                        Your Answer
                      </p>
                      <p className="text-emerald-300">{q.answer_text}</p>
                    </div>
                  )}

                  {(q.answer_status === "pending" ||
                    q.answer_status === "ai_drafted") && (
                    <div className="space-y-2">
                      {editingAnswer[q.id] || q.ai_draft ? (
                        <>
                          <textarea
                            value={
                              editingAnswer[q.id] ?? q.ai_draft ?? ""
                            }
                            onChange={(e) =>
                              setEditingAnswer((prev) => ({
                                ...prev,
                                [q.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            className={inputCls}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveAnswer(q.id)}
                              disabled={approvingAnswer === q.id}
                              className={btnPrimary}
                            >
                              {approvingAnswer === q.id ? (
                                <Loader2
                                  size={13}
                                  className="inline animate-spin mr-1"
                                />
                              ) : (
                                <CheckCircle2
                                  size={13}
                                  className="inline mr-1"
                                />
                              )}
                              Approve & Publish
                            </button>
                            <button
                              onClick={() => generateAIAnswer(q.id)}
                              disabled={generatingAnswer === q.id}
                              className={btnSecondary}
                            >
                              <Sparkles
                                size={13}
                                className="inline mr-1"
                              />{" "}
                              Regenerate
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => generateAIAnswer(q.id)}
                          disabled={generatingAnswer === q.id}
                          className={btnSecondary}
                        >
                          {generatingAnswer === q.id ? (
                            <Loader2
                              size={13}
                              className="inline animate-spin mr-1"
                            />
                          ) : (
                            <Sparkles
                              size={13}
                              className="inline mr-1"
                            />
                          )}
                          Generate AI Answer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
