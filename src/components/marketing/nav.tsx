"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Results", href: "#results" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Insights", href: "/insights" },
];

const CALCOM_URL =
  process.env.NEXT_PUBLIC_CALCOM_LINK || "https://cal.com/storageads/30min";

export default function Nav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 60);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="fixed top-0 left-0 right-0 transition-all duration-300"
        style={{
          zIndex: "var(--z-nav)",
          height: "var(--nav-height)",
          background: isScrolled
            ? "rgba(250, 249, 245, 0.92)"
            : "rgba(250, 249, 245, 0.6)",
          backdropFilter: isScrolled
            ? "blur(24px) saturate(180%)"
            : "blur(12px)",
          WebkitBackdropFilter: isScrolled
            ? "blur(24px) saturate(180%)"
            : "blur(12px)",
          borderBottom: isScrolled
            ? "1px solid var(--border-subtle)"
            : "1px solid transparent",
        }}
      >
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between px-6">
          <Link href="/" className="text-lg hover:opacity-80 transition-opacity">
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, letterSpacing: "-0.5px" }}>
              <span style={{ color: "var(--color-dark)" }}>storage</span><span style={{ color: "var(--color-gold)" }}>ads</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: "var(--color-muted)" }}
              >
                {link.label}
              </a>
            ))}
            <a
              href={CALCOM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--color-muted)" }}
            >
              Book a Call
            </a>
            <a
              href="#cta"
              className="px-5 py-2 rounded-md text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: "var(--accent)",
                color: "var(--text-inverse)",
                borderRadius: "6px",
              }}
            >
              Get a Free Audit
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X size={24} style={{ color: "var(--text-primary)" }} />
            ) : (
              <Menu size={24} style={{ color: "var(--text-primary)" }} />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center gap-8 md:hidden transition-all duration-300 ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{
          zIndex: "var(--z-overlay)",
          background: "var(--color-light)",
        }}
      >
        <button
          className="absolute top-5 right-6 p-2"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Close menu"
        >
          <X size={28} style={{ color: "var(--text-primary)" }} />
        </button>

        {NAV_LINKS.map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            onClick={() => setIsMenuOpen(false)}
            className="text-2xl font-bold transition-all"
            style={{
              color: "var(--color-dark)",
              transitionDelay: `${i * 50}ms`,
              transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
              opacity: isMenuOpen ? 1 : 0,
            }}
          >
            {link.label}
          </a>
        ))}

        <a
          href={CALCOM_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsMenuOpen(false)}
          className="text-xl font-semibold"
          style={{
            color: "var(--color-muted)",
            transitionDelay: "150ms",
            transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
            opacity: isMenuOpen ? 1 : 0,
          }}
        >
          Book a Call
        </a>

        <a
          href="#cta"
          onClick={() => setIsMenuOpen(false)}
          className="btn-primary text-lg mt-4"
          style={{
            transitionDelay: "200ms",
            transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
            opacity: isMenuOpen ? 1 : 0,
          }}
        >
          Get a Free Audit
        </a>
      </div>
    </>
  );
}
