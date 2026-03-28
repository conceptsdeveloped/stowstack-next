import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-light)] px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-blue)]">
        404
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--color-dark)] sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-base text-[var(--color-mid-gray)]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-lg bg-[var(--color-gold)] px-6 py-3 text-sm font-medium text-[var(--color-light)] transition-colors hover:bg-[var(--color-gold-hover)]"
      >
        Back to homepage
      </Link>
    </div>
  );
}
