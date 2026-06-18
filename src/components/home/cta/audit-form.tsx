"use client";

import { useState } from "react";
import { CAL_BOOKING_URL } from "@/lib/booking";

/**
 * The audit request form. Plumbing is behavior-identical to the
 * previous CTASection: same endpoint, payload, honeypot, timeout,
 * validation and error/success strings (see copy-inventory.md §16).
 */

const FIELDS = [
  { name: "name", placeholder: "Your name", type: "text", autoComplete: "name", autoCapitalize: "words" },
  { name: "email", placeholder: "Email address", type: "email", autoComplete: "email", autoCapitalize: "off" },
  { name: "facilityName", placeholder: "Facility name", type: "text", autoComplete: "organization", autoCapitalize: "words" },
  { name: "location", placeholder: "Facility location (city, state)", type: "text", autoComplete: "address-level2", autoCapitalize: "words" },
] as const;

export default function AuditForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateField(name: string, value: string) {
    if (name === "email" && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Please enter a valid email address.";
      }
    }
    if (["name", "email", "facilityName", "location"].includes(name) && !value.trim()) {
      return "This field is required.";
    }
    return "";
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  }

  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name } = e.target;
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting || isSubmitted) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData) as Record<string, string>;

    // Honeypot: bots fill every input; drop silently with fake success.
    if (data.website_url && data.website_url.trim() !== "") {
      setIsSubmitted(true);
      setIsSubmitting(false);
      return;
    }
    delete data.website_url;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch("/api/audit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      if (res.ok) {
        setIsSubmitted(true);
      } else if (res.status === 429) {
        setSubmitError(
          "Too many requests from your network. Please wait a minute and try again."
        );
      } else {
        const payload = await res.json().catch(() => null);
        setSubmitError(
          payload?.error ||
            "We couldn't send your audit request. Please try again or email blake@storageads.com."
        );
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setSubmitError(
        aborted
          ? "The request took too long. Please check your connection and try again."
          : "Network error — please check your connection and try again."
      );
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center py-12" role="status" aria-live="polite">
        <div
          className="mx-auto mb-5 flex items-center justify-center"
          style={{ width: 52, height: 52, background: "var(--tint-c12)", border: "1px solid var(--hue-c)" }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="var(--hue-c)" strokeWidth="2.4" />
          </svg>
        </div>
        <h4 style={{ fontSize: 20, marginBottom: 8 }}>Audit requested</h4>
        <p style={{ color: "var(--text-dim)", fontSize: 14.5 }}>
          You&apos;ll hear from me within 24 hours with the numbers.
        </p>
        <p className="mt-4" style={{ fontSize: 13, color: "var(--text-faint)" }}>
          Don&apos;t want to wait?{" "}
          <a
            href={CAL_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="home-link"
            style={{ color: "var(--text)", fontWeight: 600 }}
          >
            Just book a call right now
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      className="space-y-5"
      aria-label="Free facility audit request"
    >
      {/* Honeypot — hidden from users and assistive tech */}
      <input
        type="text"
        name="website_url"
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
      {FIELDS.map((f) => (
        <div key={f.name}>
          <input
            name={f.name}
            type={f.type}
            placeholder={f.placeholder}
            required
            autoComplete={f.autoComplete}
            autoCapitalize={f.autoCapitalize}
            {...(f.name === "email"
              ? { inputMode: "email" as const, autoCorrect: "off", spellCheck: false }
              : {})}
            aria-required="true"
            aria-label={f.placeholder}
            aria-invalid={!!fieldErrors[f.name]}
            aria-describedby={fieldErrors[f.name] ? `${f.name}-error` : undefined}
            onBlur={handleBlur}
            onChange={handleFieldChange}
            className="input-field"
          />
          {fieldErrors[f.name] && (
            <p id={`${f.name}-error`} className="text-xs mt-1" style={{ color: "var(--accent)" }}>
              {fieldErrors[f.name]}
            </p>
          )}
        </div>
      ))}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Submitting..." : "Request audit"}
      </button>

      {submitError && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-sm text-center"
          style={{ color: "var(--accent)" }}
        >
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center pt-1">
        {["Response within 24 hours.", "Free.", "No commitment."].map((text) => (
          <p key={text} className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
            <span aria-hidden="true" style={{ width: 5, height: 5, background: "var(--accent)", flexShrink: 0 }} />
            {text}
          </p>
        ))}
      </div>

      {/* Diagnostic upsell */}
      <a
        href="/diagnostic"
        className="home-card flex items-center gap-3 p-4"
        style={{ border: "1px solid var(--line)", background: "var(--bg-alt)" }}
      >
        <span
          aria-hidden="true"
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 34,
            height: 34,
            background: "var(--text)",
            color: "var(--bg)",
            fontFamily: "var(--mono)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ⚡
        </span>
        <span className="flex-1 min-w-0">
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--text-accent)" }}>
            Want numbers right now? Run the instant diagnostic
          </span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--text-faint)" }}>
            Scored across 8 categories against industry benchmarks. No waiting.
          </span>
        </span>
        <span aria-hidden="true" style={{ color: "var(--text-dim)", flexShrink: 0 }}>→</span>
      </a>
    </form>
  );
}
