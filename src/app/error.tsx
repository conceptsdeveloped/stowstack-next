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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-red-500">
        Error
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-base text-neutral-400">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
        >
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
