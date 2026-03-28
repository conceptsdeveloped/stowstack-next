"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";

type VerifyState = "idle" | "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>(token ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendState, setResendState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState("");

  const verifyToken = useCallback(async (verifyToken: string) => {
    setState("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: verifyToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setErrorMessage(data.error || "Verification failed");
        return;
      }

      setState("success");
    } catch {
      setState("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token, verifyToken]);

  const handleResend = async () => {
    setResendState("loading");
    setResendError("");

    try {
      const sessionToken = localStorage.getItem("org_token") || localStorage.getItem("session_token");
      if (!sessionToken) {
        setResendState("error");
        setResendError("You must be logged in to resend verification.");
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken.startsWith("ss_")) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
      } else {
        headers["X-Org-Token"] = sessionToken;
      }

      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "resend" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResendState("error");
        setResendError(data.error || "Failed to resend email");
        return;
      }

      setResendState("sent");
    } catch {
      setResendState("error");
      setResendError("Something went wrong. Please try again.");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-light)" }}
    >
      <header
        className="border-b"
        style={{ borderColor: "var(--color-light-gray)" }}
      >
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="text-lg font-semibold"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-dark)",
            }}
          >
            <span>storage</span>
            <span style={{ color: "var(--color-gold)" }}>ads</span>
          </Link>
          <span style={{ color: "var(--color-mid-gray)" }}>/</span>
          <span
            className="text-sm"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-mid-gray)",
            }}
          >
            Email Verification
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div
          className="w-full max-w-md rounded-xl p-8"
          style={{
            backgroundColor: "white",
            border: "1px solid var(--color-light-gray)",
          }}
        >
          {/* Loading state */}
          {state === "loading" && (
            <div className="text-center" role="status" aria-live="polite">
              <div
                className="inline-block h-10 w-10 rounded-full border-3 border-t-transparent animate-spin mb-4"
                style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }}
                aria-hidden="true"
              />
              <h1
                className="text-xl font-medium mb-2"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-dark)",
                }}
              >
                Verifying your email
              </h1>
              <p
                className="text-sm"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-body-text)",
                }}
              >
                Please wait a moment...
              </p>
            </div>
          )}

          {/* Success state */}
          {state === "success" && (
            <div className="text-center" role="status" aria-live="polite">
              <div
                className="inline-flex items-center justify-center h-14 w-14 rounded-full mb-4"
                style={{ backgroundColor: "var(--color-gold-light)" }}
                aria-hidden="true"
              >
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  style={{ color: "var(--color-gold)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1
                className="text-xl font-medium mb-2"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-dark)",
                }}
              >
                Email verified
              </h1>
              <p
                className="text-sm mb-6"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-body-text)",
                }}
              >
                Your email has been verified successfully. You can now access all
                partner features.
              </p>
              <Link
                href="/partner"
                className="inline-block rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-heading)",
                  backgroundColor: "var(--color-gold)",
                  color: "var(--color-light)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--color-gold-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--color-gold)")
                }
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="text-center" role="alert">
              <div
                className="inline-flex items-center justify-center h-14 w-14 rounded-full mb-4"
                style={{ backgroundColor: "rgba(176,74,58,0.1)" }}
                aria-hidden="true"
              >
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  style={{ color: "var(--color-red)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1
                className="text-xl font-medium mb-2"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-dark)",
                }}
              >
                Verification failed
              </h1>
              <p
                className="text-sm mb-6"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-red)",
                }}
              >
                {errorMessage}
              </p>
              <Link
                href="/partner"
                className="inline-block text-sm font-medium underline transition-colors"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-gold)",
                }}
              >
                Back to Dashboard
              </Link>
            </div>
          )}

          {/* Idle state — no token, show resend prompt */}
          {state === "idle" && (
            <div className="text-center" role="main">
              <div
                className="inline-flex items-center justify-center h-14 w-14 rounded-full mb-4"
                style={{ backgroundColor: "var(--color-gold-light)" }}
                aria-hidden="true"
              >
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ color: "var(--color-gold)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1
                className="text-xl font-medium mb-2"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-dark)",
                }}
              >
                Check your email
              </h1>
              <p
                className="text-sm mb-6"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-body-text)",
                }}
              >
                We sent you a verification link. Click the link in the email to
                verify your account.
              </p>

              {resendState === "sent" ? (
                <p
                  className="text-sm font-medium"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-gold)",
                  }}
                  role="status"
                  aria-live="polite"
                >
                  Verification email sent!
                </p>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === "loading"}
                    className="inline-block rounded-lg px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
                    style={{
                      fontFamily: "var(--font-heading)",
                      backgroundColor: "var(--color-gold)",
                      color: "var(--color-light)",
                      cursor:
                        resendState === "loading" ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (resendState !== "loading") {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-gold-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-gold)";
                    }}
                    aria-label="Resend verification email"
                  >
                    {resendState === "loading"
                      ? "Sending..."
                      : "Resend Verification Email"}
                  </button>
                  {resendState === "error" && (
                    <p
                      className="text-xs mt-3"
                      style={{ color: "var(--color-red)" }}
                      role="alert"
                    >
                      {resendError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "var(--color-light)" }}
        >
          <div
            className="h-10 w-10 rounded-full border-3 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--color-gold)",
              borderTopColor: "transparent",
            }}
            role="status"
            aria-label="Loading"
          />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
