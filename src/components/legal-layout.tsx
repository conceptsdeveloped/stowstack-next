import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-void)" }}>
      <header
        className="sticky top-0 z-[var(--z-nav)] border-b"
        style={{
          background: "var(--bg-void)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={20} />
          </Link>
          <span
            className="text-sm font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Stow
            <span style={{ color: "var(--accent)" }}>Stack</span>
          </span>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-10">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: "var(--text-tertiary)" }}
        >
          Last updated: March 1, 2026
        </p>
        <div
          className="legal-content"
          style={{ color: "var(--text-secondary)" }}
        >
          {children}
        </div>
      </article>
    </div>
  );
}
