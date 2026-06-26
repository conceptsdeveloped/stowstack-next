"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight } from "lucide-react";

interface ExitIntentPopupProps {
  facilityName?: string;
  auditScore?: number;
}

export function ExitIntentPopup({ facilityName, auditScore }: ExitIntentPopupProps) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= 5 && !show && !submitted) {
      const dismissed = sessionStorage.getItem("exit_intent_dismissed");
      if (!dismissed) {
        setShow(true);
      }
    }
  }, [show, submitted]);

  useEffect(() => {
    // Delay activation by 10 seconds
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 10000);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave]);

  function dismiss() {
    setShow(false);
    sessionStorage.setItem("exit_intent_dismissed", "1");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || submitting || submitted) return;

    // Honeypot — bot fills website field; fake success and exit
    if (website.trim() !== "") {
      setSubmitted(true);
      setTimeout(dismiss, 3000);
      return;
    }

    setSubmitting(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/consumer-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          facilityName: facilityName || "Unknown",
          source: "exit_intent",
          utm_source: "exit_intent",
        }),
        signal: controller.signal,
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(dismiss, 3000);
      } else if (res.status === 429) {
        setError("Too many requests. Please try again in a minute.");
      } else {
        const payload = await res.json().catch(() => null);
        setError(payload?.error || "Couldn't send. Please try again.");
      }
    } catch (err) {
      const aborted =
        err instanceof DOMException && err.name === "AbortError";
      setError(
        aborted
          ? "Request timed out. Please check your connection."
          : "Network error. Please try again."
      );
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(20, 20, 19, 0.6)", backdropFilter: "blur(4px)" }}
      onKeyDown={(e) => { if (e.key === "Escape") dismiss(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-8 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-intent-popup-title"
        style={{ background: "var(--color-light)", border: "1px solid var(--color-light-gray)" }}
      >
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-full p-1 transition-colors hover:bg-[var(--color-light-gray)]"
          aria-label="Close"
        >
          <X className="h-5 w-5" style={{ color: "var(--color-mid-gray)" }} />
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div className="mb-3 text-2xl">&#10003;</div>
            <p className="text-lg font-semibold" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>
              Check your inbox
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-body-text)" }}>
              We&apos;ll send your full audit results shortly.
            </p>
          </div>
        ) : (
          <>
            <p
              className="text-sm font-medium uppercase tracking-wider mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Before you go
            </p>
            <h3
              id="exit-intent-popup-title"
              className="text-xl font-semibold mb-3"
              style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}
            >
              {auditScore
                ? `Your facility scored ${auditScore}/100`
                : "Get your full audit results"}
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--color-body-text)" }}>
              {facilityName
                ? `We'll email the complete breakdown for ${facilityName}: the fixes that matter most.`
                : "Enter your email and we'll send the full breakdown: the fixes that matter most and what they're worth."}
            </p>

            <form onSubmit={handleSubmit} className="flex gap-2">
              {/* Honeypot */}
              <input
                type="text"
                name="website_url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-10000px",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@facility.com"
                required
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Your email address"
                className="flex-1 rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-dark)]"
                style={{
                  borderColor: "var(--color-light-gray)",
                  background: "var(--color-light)",
                  color: "var(--color-dark)",
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
                style={{
                  background: "var(--color-dark)",
                  color: "var(--color-light)",
                }}
              >
                {submitting ? "Sending…" : "Send"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            {error && (
              <p
                role="alert"
                aria-live="assertive"
                className="mt-3 text-xs text-center"
                style={{ color: "var(--color-red)" }}
              >
                {error}
              </p>
            )}

            <p className="mt-4 text-xs text-center" style={{ color: "var(--color-mid-gray)" }}>
              No spam. Just your audit results and one follow-up.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
