"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { CAL_BOOKING_URL } from "@/lib/booking";
import { DUR, EASE, STAGGER } from "@/lib/motion";
import Logo from "./logo";

/* ── Link configuration — identical destinations to the previous nav ── */
const SECTION_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Results", href: "#results" },
  { label: "Calculator", href: "#calculator" },
];

const PAGE_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Insights", href: "/insights" },
];

const ALL_DESKTOP_LINKS = [...SECTION_LINKS, ...PAGE_LINKS];

/* ── Active section hook ── */
function useActiveSection(sectionIds: string[]) {
  const [active, setActive] = useState("");
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(`#${id}`);
        },
        { rootMargin: "-40% 0px -55% 0px" },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);
  return active;
}

/* ── iOS-safe scroll lock ── */
function useScrollLock(locked: boolean) {
  const scrollY = useRef(0);
  useEffect(() => {
    if (locked) {
      scrollY.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY.current);
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
    };
  }, [locked]);
}

const overlayVariants = {
  hidden: { opacity: 0, transition: { duration: DUR.fast, ease: EASE.exit } },
  show: { opacity: 1, transition: { duration: DUR.fast, ease: EASE.out } },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER.tight, delayChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } },
};

export default function HomeNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const activeSection = useActiveSection(["how-it-works", "results", "calculator"]);

  useScrollLock(isMenuOpen);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  /* Scroll detection */
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
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Close on escape */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isMenuOpen) closeMenu();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen, closeMenu]);

  /* Focus trap inside the open overlay */
  useEffect(() => {
    if (!isMenuOpen) return;
    const panel = menuRef.current;
    if (!panel) return;
    const selector =
      'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
    const focusable = panel.querySelectorAll<HTMLElement>(selector);
    if (focusable.length > 0) focusable[0].focus();

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panel) return;
      const items = panel.querySelectorAll<HTMLElement>(selector);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [isMenuOpen]);

  const handleLinkClick = useCallback(() => setIsMenuOpen(false), []);

  return (
    <>
      {/* ── Top bar ── */}
      <nav
        aria-label="Primary navigation"
        className="fixed top-0 left-0 right-0"
        style={{
          zIndex: "var(--z-nav)",
          height: "calc(var(--nav-height) + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
          background: isScrolled
            ? "color-mix(in srgb, var(--bg) 90%, transparent)"
            : "transparent",
          backdropFilter: isScrolled ? "blur(16px) saturate(160%)" : "none",
          WebkitBackdropFilter: isScrolled ? "blur(16px) saturate(160%)" : "none",
          borderBottom: isScrolled
            ? "1px solid var(--line-dim)"
            : "1px solid transparent",
          transition:
            "background 360ms cubic-bezier(0.22,1,0.36,1), border-color 360ms ease, backdrop-filter 360ms ease",
        }}
      >
        <div className="max-w-[1380px] mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-10">
          {/* Logo + LIVE tag */}
          <div className="flex items-center gap-3 relative" style={{ zIndex: 2 }}>
            <Link
              href="/"
              className="hover:opacity-80"
              style={{ transition: "opacity 200ms ease" }}
              aria-label="StorageAds home"
            >
              <Logo />
            </Link>
            <span
              className="hidden sm:inline-flex items-center gap-1.5"
              style={{
                padding: "2px 6px",
                border: "1px solid var(--accent)",
                background: "var(--accent-a14)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  background: "var(--accent)",
                  animation: "mono-pulse 1.6s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "var(--track-label)",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  fontWeight: 500,
                }}
              >
                Live
              </span>
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {ALL_DESKTOP_LINKS.map((link) => {
              const isActive =
                link.href.startsWith("#") && activeSection === link.href;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="relative px-3 py-2"
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "var(--track-label)",
                    textTransform: "uppercase",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--text-accent)" : "var(--text-dim)",
                    transition: "color 200ms ease",
                  }}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 12,
                      right: 12,
                      bottom: 4,
                      height: 1.5,
                      background: "var(--text)",
                      transform: isActive ? "scaleX(1)" : "scaleX(0)",
                      transformOrigin: "left",
                      transition: "transform 240ms cubic-bezier(0.22,1,0.36,1)",
                    }}
                  />
                </a>
              );
            })}

            <div className="w-px h-5 mx-3" style={{ background: "var(--line)" }} />

            <a
              href={CAL_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="home-link"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                fontWeight: 500,
                color: "var(--text)",
                padding: "8px 10px",
                whiteSpace: "nowrap",
              }}
            >
              Book a Call
            </a>

            <a
              href="#cta"
              className="home-cta ml-2"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 16px",
                border: "1px solid var(--text)",
                color: "var(--text)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Request Audit
              <span aria-hidden="true">→</span>
            </a>
          </div>

          {/* Hamburger (44px target) */}
          <button
            ref={hamburgerRef}
            className="lg:hidden relative flex items-center justify-center -mr-1"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            style={{
              zIndex: "calc(var(--z-overlay) + 10)",
              width: 44,
              height: 44,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              color: isMenuOpen ? "var(--bg)" : "var(--text)",
            }}
          >
            <span className="relative block" style={{ width: 22, height: 14 }}>
              <span
                className="absolute left-0 w-full"
                style={{
                  height: 2,
                  background: "currentColor",
                  top: isMenuOpen ? "50%" : 0,
                  transform: isMenuOpen
                    ? "translateY(-50%) rotate(45deg)"
                    : "none",
                  transition: "all 300ms cubic-bezier(0.22,1,0.36,1)",
                }}
              />
              <span
                className="absolute left-0 w-full"
                style={{
                  height: 2,
                  background: "currentColor",
                  bottom: isMenuOpen ? "auto" : 0,
                  top: isMenuOpen ? "50%" : "auto",
                  transform: isMenuOpen
                    ? "translateY(-50%) rotate(-45deg)"
                    : "none",
                  transition: "all 300ms cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* ── Full-screen ink overlay menu ── */}
      <m.div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="fixed inset-0 lg:hidden ground-ink"
        variants={overlayVariants}
        initial={false}
        animate={isMenuOpen ? "show" : "hidden"}
        style={{
          zIndex: "var(--z-overlay)",
          background: "var(--bg-ink)",
          pointerEvents: isMenuOpen ? "auto" : "none",
          visibility: isMenuOpen ? "visible" : "hidden",
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
        transition={reduce ? { duration: 0 } : undefined}
      >
        <div
          className="flex flex-col min-h-full"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 84px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)",
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <m.div
            variants={reduce ? undefined : listVariants}
            initial={false}
            animate={isMenuOpen ? "show" : "hidden"}
            className="flex flex-col"
          >
            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "var(--track-label-wide)",
                textTransform: "uppercase",
                color: "var(--text-on-ink-dim)",
                marginBottom: 14,
              }}
            >
              On this page
            </p>
            {SECTION_LINKS.map((link) => (
              <m.div key={link.label} variants={reduce ? undefined : itemVariants}>
                <a
                  href={link.href}
                  onClick={handleLinkClick}
                  className="flex items-baseline gap-3 group"
                  style={{
                    minHeight: 52,
                    padding: "6px 0",
                    color: "var(--bg)",
                    fontFamily: "var(--serif)",
                    fontWeight: 200,
                    fontSize: "clamp(2rem, 9vw, 2.875rem)",
                    letterSpacing: "var(--track-display)",
                    lineHeight: 1.15,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  {link.label}
                </a>
              </m.div>
            ))}

            <div
              aria-hidden="true"
              style={{ height: 1, background: "var(--line-on-ink)", margin: "20px 0" }}
            />

            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "var(--track-label-wide)",
                textTransform: "uppercase",
                color: "var(--text-on-ink-dim)",
                marginBottom: 14,
              }}
            >
              Explore
            </p>
            {PAGE_LINKS.map((link) => (
              <m.div key={link.label} variants={reduce ? undefined : itemVariants}>
                <Link
                  href={link.href}
                  onClick={handleLinkClick}
                  className="flex items-baseline justify-between group"
                  style={{
                    minHeight: 48,
                    padding: "6px 0",
                    color: "var(--bg)",
                    fontFamily: "var(--serif)",
                    fontWeight: 500,
                    fontSize: 22,
                    letterSpacing: "-0.02em",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  {link.label}
                  <span aria-hidden="true" style={{ color: "var(--text-on-ink-dim)", fontSize: 16 }}>
                    →
                  </span>
                </Link>
              </m.div>
            ))}
          </m.div>

          <div className="flex-1 min-h-8" />

          {/* Pinned CTAs */}
          <m.div
            className="flex flex-col gap-3"
            variants={reduce ? undefined : itemVariants}
            initial={false}
            animate={isMenuOpen ? "show" : "hidden"}
          >
            <a
              href={CAL_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="flex items-center justify-center gap-2"
              style={{
                minHeight: 52,
                padding: "14px 20px",
                fontSize: 13,
                fontFamily: "var(--mono)",
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--bg)",
                border: "1px solid var(--line-on-ink-hi)",
                background: "transparent",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              Book a Call
            </a>
            <a
              href="#cta"
              onClick={handleLinkClick}
              className="flex items-center justify-center gap-2"
              style={{
                minHeight: 52,
                padding: "14px 20px",
                fontSize: 13,
                fontFamily: "var(--mono)",
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                fontWeight: 700,
                background: "var(--bg)",
                color: "var(--bg-ink)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              Request Audit <span aria-hidden="true">→</span>
            </a>
            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                color: "var(--text-on-ink-dim)",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Built by storage operators · storageads.com
            </p>
          </m.div>
        </div>
      </m.div>
    </>
  );
}
