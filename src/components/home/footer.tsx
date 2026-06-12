import { CAL_BOOKING_URL } from "@/lib/booking";
import Logo from "./logo";

/* Identical destinations to the previous footer. */
const FOOTER_LINKS: Array<{ label: string; href: string; external?: boolean }> = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Free Diagnostic", href: "/diagnostic" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Insights", href: "/insights" },
  { label: "Demo", href: "/demo" },
  { label: "Book a Call", href: CAL_BOOKING_URL, external: true },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Data Deletion", href: "/data-deletion" },
];

const label: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: "var(--track-label)",
  textTransform: "uppercase",
  color: "var(--text-faint)",
  fontWeight: 600,
};

export default function HomeFooter() {
  return (
    <footer
      style={{
        background: "var(--bg)",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div className="max-w-[1380px] mx-auto px-5 sm:px-8 lg:px-10 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-6">
          {/* Brand */}
          <div className="md:col-span-5">
            <Logo size={20} />
            <p
              className="mt-3 text-sm"
              style={{ color: "var(--text-dim)", maxWidth: 320, lineHeight: 1.6 }}
            >
              REIT-grade marketing infrastructure for independent operators.
            </p>
            <p
              className="mt-4 text-xs"
              style={{ color: "var(--text-faint)", maxWidth: 320, lineHeight: 1.6 }}
            >
              Deployed on our own portfolio before any client engagement.
            </p>
          </div>

          {/* Navigation */}
          <div className="md:col-span-3">
            <p style={label} className="mb-4">
              Navigation
            </p>
            <nav aria-label="Footer navigation" className="grid grid-cols-2 md:grid-cols-1 gap-x-4">
              {FOOTER_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  {...(link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="home-link inline-block w-fit text-sm py-1.5"
                  style={{ color: "var(--text-dim)" }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact + Legal */}
          <div className="md:col-span-4">
            <p style={label} className="mb-4">
              Contact
            </p>
            <a
              href="mailto:blake@storageads.com"
              className="home-link inline-block w-fit text-sm"
              style={{ color: "var(--text)" }}
            >
              blake@storageads.com
            </a>

            <p style={label} className="mt-8 mb-4">
              Legal
            </p>
            <div className="flex flex-col">
              {LEGAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="home-link inline-block w-fit text-sm py-1.5"
                  style={{ color: "var(--text-faint)" }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Document close */}
        <div
          className="mt-14 pt-5 flex flex-wrap items-center justify-between gap-3"
          style={{ borderTop: "1px solid var(--line-dim)" }}
        >
          <p
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--text-faint)",
            }}
          >
            &copy; {new Date().getFullYear()} StorageAds. All rights reserved.
          </p>
          <p
            aria-hidden="true"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "var(--track-label)",
              textTransform: "uppercase",
              color: "var(--text-faint)",
            }}
          >
            § EOF · storageads.com
          </p>
        </div>
      </div>
    </footer>
  );
}
