"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "Poppins, sans-serif", background: "#faf9f5", color: "#141413", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "#6a6560", marginBottom: 24 }}>An unexpected error occurred. Our team has been notified.</p>
          <button
            onClick={reset}
            style={{ background: "#B58B3F", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: 16 }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
