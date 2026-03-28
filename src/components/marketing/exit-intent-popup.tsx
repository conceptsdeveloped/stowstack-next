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
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/consumer-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          facilityName: facilityName || "Unknown",
          source: "exit_intent",
          utm_source: "exit_intent",
        }),
      });
      setSubmitted(true);
      setTimeout(dismiss, 3000);
    } catch {
      // silently fail
    } finally {
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
              style={{ color: "var(--color-gold)" }}
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
                : "Enter your email and we'll send you the complete breakdown with actionable recommendations."}
            </p>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@facility.com"
                required
                aria-label="Your email address"
                className="flex-1 rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
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
                  background: "var(--color-gold)",
                  color: "var(--color-light)",
                }}
              >
                Send
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-4 text-xs text-center" style={{ color: "var(--color-mid-gray)" }}>
              No spam. Just your audit results and one follow-up.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
