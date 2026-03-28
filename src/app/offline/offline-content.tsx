"use client";

export function OfflineContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-light)] px-6 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-gold)]/10">
        <svg className="h-8 w-8 text-[var(--color-gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h1 className="mb-2 font-[var(--font-heading)] text-xl font-semibold text-[var(--color-dark)]">
        You&apos;re Offline
      </h1>
      <p className="mb-6 max-w-xs text-sm text-[var(--color-body-text)]">
        It looks like you&apos;ve lost your internet connection. Check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary"
      >
        Retry
      </button>
    </div>
  );
}
