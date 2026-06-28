"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { usePortal } from "@/components/portal/portal-shell";
import { type Message, relativeTime } from "@/lib/portal-helpers";
import { EmptyState, SectionSkeleton, ErrorState } from "@/components/portal/ui";

export default function MessagesPage() {
  const { session } = usePortal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/client-messages?accessCode=${encodeURIComponent(session.accessCode)}&email=${encodeURIComponent(session.email)}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setMessages(json.messages || []);
      setError("");
    } catch {
      setError("Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, [session.accessCode, session.email]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [loading, messages.length, scrollToBottom]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch(
        `/api/client-messages?accessCode=${encodeURIComponent(session.accessCode)}&email=${encodeURIComponent(session.email)}`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          from: "client",
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      setText("");
      await fetchMessages();
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {loading ? (
            <SectionSkeleton />
          ) : error && messages.length === 0 ? (
            <ErrorState message={error} onRetry={fetchMessages} />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-10 w-10" />}
              title="No messages yet"
              message="Send your account manager a note below."
            />
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === "client" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.from === "client"
                      ? "rounded-br-md bg-[var(--color-dark)] text-[var(--color-light)]"
                      : "rounded-bl-md border border-[var(--border-subtle)] bg-[var(--color-light-gray)] text-[var(--color-dark)]"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      msg.from === "client" ? "text-[var(--color-light)]/50" : "text-[var(--color-mid-gray)]"
                    }`}
                  >
                    {msg.from === "admin" ? "StorageAds" : "You"} &middot;{" "}
                    {relativeTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Compose */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--color-light)] p-4">
        <form
          onSubmit={handleSend}
          className="mx-auto flex max-w-2xl items-end gap-3"
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message"
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] outline-none transition-colors focus:border-[var(--color-dark)]/50 focus:ring-1 focus:ring-[var(--color-dark)]/25"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-dark)] text-[var(--color-light)] transition-colors hover:opacity-90 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
