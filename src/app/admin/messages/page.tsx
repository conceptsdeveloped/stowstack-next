"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";

/* ── types ── */

interface Thread {
  clientId: string;
  accessCode: string;
  email: string | null;
  facilityName: string | null;
  lastMessage: string;
  lastFrom: string | null;
  lastAt: string | null;
  unread: number;
  total: number;
}

interface WireMessage {
  id: string;
  from: string;
  text: string;
  timestamp: string;
}

function relTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── page ── */

export default function AdminMessagesPage() {
  const { data, loading, refetch } = useAdminFetch<{ threads: Thread[] }>(
    "/api/admin-message-threads",
  );
  const threads = data?.threads ?? [];
  const [selected, setSelected] = useState<Thread | null>(null);

  // Keep the selected thread object fresh after a refetch.
  useEffect(() => {
    if (selected) {
      const match = threads.find((t) => t.clientId === selected.clientId);
      if (match && match !== selected) setSelected(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-dark)] flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </h1>
          <p className="text-sm text-[var(--color-mid-gray)] mt-1">
            Client portal conversations. Replies post as StorageAds.
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-dark)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
        {/* Thread list */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-sm text-[var(--color-mid-gray)]">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="mx-auto h-8 w-8 text-[var(--color-mid-gray)]" />
              <p className="mt-2 text-sm text-[var(--color-mid-gray)]">
                No conversations yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {threads.map((t) => (
                <li key={t.clientId}>
                  <button
                    onClick={() => setSelected(t)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-[var(--color-light-gray)]/40 ${
                      selected?.clientId === t.clientId
                        ? "bg-[var(--color-light-gray)]/60"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[var(--color-dark)]">
                        {t.facilityName || t.email || "Client"}
                      </span>
                      <span className="shrink-0 text-[10px] text-[var(--color-mid-gray)]">
                        {relTime(t.lastAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-[var(--color-mid-gray)]">
                        {t.lastFrom === "admin" ? "You: " : ""}
                        {t.lastMessage}
                      </span>
                      {t.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-[var(--color-dark)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-light)]">
                          {t.unread}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Conversation */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] min-h-[420px]">
          {selected ? (
            <Conversation
              key={selected.accessCode}
              thread={selected}
              onSent={refetch}
            />
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-[var(--color-mid-gray)]">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── conversation panel ── */

function Conversation({
  thread,
  onSent,
}: {
  thread: Thread;
  onSent: () => void;
}) {
  const [messages, setMessages] = useState<WireMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch<{ messages: WireMessage[] }>(
        `/api/client-messages?accessCode=${encodeURIComponent(thread.accessCode)}`,
      );
      setMessages(res.messages ?? []);
      setError("");
    } catch {
      setError("Failed to load conversation.");
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [thread.accessCode]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await adminFetch(
        `/api/client-messages?accessCode=${encodeURIComponent(thread.accessCode)}`,
        { method: "POST", body: JSON.stringify({ text: trimmed, from: "admin" }) },
      );
      setText("");
      await load();
      onSent();
    } catch {
      setError("Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--color-dark)]">
          {thread.facilityName || thread.email || "Client"}
        </p>
        {thread.email && (
          <p className="text-xs text-[var(--color-mid-gray)]">{thread.email}</p>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--color-mid-gray)]" />
        ) : error && messages.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-red)]">{error}</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-mid-gray)]">
            No messages in this thread yet.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.from === "admin" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                  m.from === "admin"
                    ? "rounded-br-md bg-[var(--color-dark)] text-[var(--color-light)]"
                    : "rounded-bl-md border border-[var(--border-subtle)] bg-[var(--color-light-gray)] text-[var(--color-dark)]"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    m.from === "admin"
                      ? "text-[var(--color-light)]/50"
                      : "text-[var(--color-mid-gray)]"
                  }`}
                >
                  {m.from === "admin" ? "You" : "Client"} &middot; {relTime(m.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-[var(--border-subtle)] p-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          rows={1}
          placeholder="Reply as StorageAds..."
          aria-label="Reply"
          className="flex-1 resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-dark)]/50"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Send reply"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-dark)] text-[var(--color-light)] transition hover:opacity-90 disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
