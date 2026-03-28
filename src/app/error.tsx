"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-light)] px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-red-500">
        Error
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--color-dark)] sm:text-5xl">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-base text-[var(--color-body-text)]">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-lg bg-[var(--color-gold)] px-6 py-3 text-sm font-medium text-[var(--color-light)] transition-colors hover:bg-[var(--color-gold-hover)]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-[var(--border-medium)] px-6 py-3 text-sm font-medium text-[var(--color-body-text)] transition-colors hover:border-[var(--color-mid-gray)] hover:text-[var(--color-dark)]"
        >
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
