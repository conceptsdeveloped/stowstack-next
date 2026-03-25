"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-dark)" }}>
        Something went wrong
      </h2>
      <p className="text-sm mb-6 max-w-md" style={{ color: "var(--color-mid-gray)" }}>
        {error.message || "An unexpected error occurred in the admin dashboard."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
        style={{ backgroundColor: "var(--color-gold)", color: "var(--color-light)" }}
      >
        Try again
      </button>
    </div>
  );
}
