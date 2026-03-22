"use client";

import { useAdminFetch } from "@/hooks/use-admin-fetch";
import {
  GitCommit,
  Sparkles,
  Bug,
  Wrench,
} from "lucide-react";

interface CommitNote {
  id: string;
  title: string;
  description: string;
  type: "feature" | "fix" | "improvement";
  date: string;
}

const TYPE_CONFIG: Record<string, { bg: string; text: string; icon: typeof GitCommit; label: string }> = {
  feature: { bg: "rgba(34,197,94,0.1)", text: "#22C55E", icon: Sparkles, label: "Feature" },
  fix: { bg: "rgba(239,68,68,0.1)", text: "#EF4444", icon: Bug, label: "Fix" },
  improvement: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6", icon: Wrench, label: "Improvement" },
};

function ChangelogSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, gi) => (
        <div key={gi}>
          <div className="h-4 w-32 rounded bg-white/5 mb-4 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border p-5 animate-pulse"
                style={{ backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="h-4 w-2/3 rounded bg-white/5 mb-2" />
                <div className="h-3 w-full rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupByDate(notes: CommitNote[]): Record<string, CommitNote[]> {
  const groups: Record<string, CommitNote[]> = {};
  for (const note of notes) {
    const dateKey = new Date(note.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(note);
  }
  return groups;
}

export default function ChangelogPage() {
  const { data: rawData, loading, error } = useAdminFetch<{ enrichments: Record<string, { title?: string; description?: string; type?: "feature" | "fix" | "improvement"; date?: string }> }>("/api/commit-notes");
  const notes: CommitNote[] = rawData?.enrichments
    ? Object.entries(rawData.enrichments).map(([key, val]) => ({
        id: key,
        title: val.title || key,
        description: val.description || "",
        type: val.type || "improvement",
        date: val.date || new Date().toISOString(),
      }))
    : [];

  const groupedNotes = notes ? groupByDate(notes) : {};
  const dateKeys = Object.keys(groupedNotes);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#F5F5F7" }}>Changelog</h1>
        <p className="text-sm mt-1" style={{ color: "#6E6E73" }}>
          Recent updates and improvements
        </p>
      </div>

      {error && (
        <div className="rounded-lg border p-4 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)", color: "#EF4444" }}>
          Failed to load changelog: {error}
        </div>
      )}

      {loading ? (
        <ChangelogSkeleton />
      ) : dateKeys.length > 0 ? (
        <div className="space-y-10">
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
                <span className="text-xs font-medium shrink-0" style={{ color: "#6E6E73" }}>
                  {dateKey}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
              </div>

              <div className="space-y-3">
                {groupedNotes[dateKey].map((note) => {
                  const config = TYPE_CONFIG[note.type] || TYPE_CONFIG.improvement;
                  const Icon = config.icon;

                  return (
                    <div
                      key={note.id}
                      className="rounded-xl border p-5 transition-colors hover:bg-white/[0.01]"
                      style={{ backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: config.bg }}
                        >
                          <Icon size={14} style={{ color: config.text }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium" style={{ color: "#F5F5F7" }}>
                              {note.title}
                            </h3>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: config.bg, color: config.text }}
                            >
                              {config.label}
                            </span>
                          </div>
                          {note.description && (
                            <p className="text-sm leading-relaxed" style={{ color: "#A1A1A6" }}>
                              {note.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <GitCommit size={32} className="mx-auto mb-3" style={{ color: "#6E6E73" }} />
          <p className="text-sm" style={{ color: "#6E6E73" }}>No changelog entries yet</p>
        </div>
      )}
    </div>
  );
}
