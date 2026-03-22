import { Mail } from "lucide-react";

const FOOTER_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Free Diagnostic", href: "/diagnostic" },
  { label: "API Docs", href: "/docs" },
  { label: "Demo", href: "/demo" },
  { label: "Book a Call", href: "#cta" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Data Deletion", href: "/data-deletion" },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--bg-void)",
        borderTop: "1px solid var(--border-subtle)",
      }}
    >
      <div className="section-content px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <p className="text-lg font-bold text-white mb-2">StowStack</p>
            <p
              className="text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              Full-funnel acquisition and conversion for self-storage.
            </p>
            <p
              className="text-xs mt-4 italic"
              style={{ color: "var(--text-tertiary)" }}
            >
              Built by an operator. Tested at my own facilities first.
            </p>
          </div>

          {/* Links */}
          <div>
            <p
              className="text-xs font-bold uppercase mb-4"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              Navigation
            </p>
            <div className="space-y-2">
              {FOOTER_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact & Legal */}
          <div>
            <p
              className="text-xs font-bold uppercase mb-4"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              Contact
            </p>
            <a
              href="mailto:blake@stowstack.co"
              className="flex items-center gap-2 text-sm mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              <Mail size={14} />
              blake@stowstack.co
            </a>

            <p
              className="text-xs font-bold uppercase mb-4"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              Legal
            </p>
            <div className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          className="mt-12 pt-8 text-center text-xs"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            color: "var(--text-tertiary)",
          }}
        >
          &copy; {new Date().getFullYear()} StowStack. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
