"use client";

import { useEffect, useRef, useState } from "react";
import { CAL_BOOKING_URL, CAL_EMBED_SLUG } from "@/lib/booking";

/**
 * Cal.com inline embed — the official queue-snippet pattern, identical
 * behavior to the previous CTASection embed: lazy script load into
 * #cal-embed, 8s timeout fallback, MutationObserver loaded detection,
 * strict-mode double-init guard.
 */

const TRUST_SIGNALS = [
  "No long-term contracts",
  "Live in your first week",
  "Built and tested on our own facilities",
  "storEDGE built in",
];

export default function CalCard() {
  const [calLoaded, setCalLoaded] = useState(false);
  const [calFailed, setCalFailed] = useState(false);
  const calInitRef = useRef(false);

  useEffect(() => {
    if (calLoaded || calFailed || calInitRef.current) return;
    calInitRef.current = true;

    type CalFn = ((...args: unknown[]) => void) & {
      loaded?: boolean;
      ns?: Record<string, unknown>;
      q?: unknown[];
    };
    const w = window as unknown as { Cal?: CalFn };

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setCalFailed(true);
    }, 8000);

    try {
      (function (C: { Cal?: CalFn; document: Document }, A: string, L: string) {
        const p = (a: CalFn, ar: unknown[]) => {
          (a.q = a.q || []).push(ar);
        };
        const d = C.document;
        const baseFn = ((...args: unknown[]) => {
          const cal = C.Cal as CalFn;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            const s = d.createElement("script");
            s.src = A;
            s.onerror = () => setCalFailed(true);
            d.head.appendChild(s);
            cal.loaded = true;
          }
          if (args[0] === L) {
            const api: CalFn = ((...inner: unknown[]) => {
              p(api, inner);
            }) as CalFn;
            const namespace = args[1];
            api.q = api.q || [];
            if (typeof namespace === "string") {
              cal.ns = cal.ns || {};
              cal.ns[namespace] = cal.ns[namespace] || api;
              p(cal.ns[namespace] as CalFn, args);
              p(cal, ["initNamespace", namespace]);
            } else {
              p(cal, args);
            }
            return;
          }
          p(cal, args);
        }) as CalFn;
        C.Cal = C.Cal || baseFn;
      })(w as { Cal?: CalFn; document: Document }, "https://app.cal.com/embed/embed.js", "init");

      const cal = w.Cal!;
      cal("init", { origin: "https://cal.com" });
      cal("inline", {
        calLink: CAL_EMBED_SLUG,
        elementOrSelector: "#cal-embed",
        config: { theme: "light", layout: "month_view" },
      });
      cal("ui", {
        theme: "light",
        styles: { branding: { brandColor: "#141413" } },
        hideEventTypeDetails: false,
      });

      const container = document.querySelector("#cal-embed");
      if (container) {
        const observer = new MutationObserver(() => {
          if (container.querySelector("iframe")) {
            clearTimeout(timeoutId);
            if (!timedOut) setCalLoaded(true);
            observer.disconnect();
          }
        });
        observer.observe(container, { childList: true, subtree: true });
      }
    } catch {
      clearTimeout(timeoutId);
      // Fail asynchronously (lint: no sync setState in effect body).
      setTimeout(() => setCalFailed(true), 0);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [calLoaded, calFailed]);

  return (
    <div>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Book a 30-minute walkthrough</h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-dim)", marginBottom: 18 }}>
        Thirty minutes. Your market map, your competitors, and what the system
        would do at your facility. You talk to the founders, not a sales rep.
      </p>

      <div id="cal-embed" className="w-full" style={{ minHeight: 550, overflow: "hidden" }}>
        {!calLoaded && !calFailed && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 animate-pulse" aria-hidden="true">
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} style={{ width: 26, height: 26, background: "var(--ink-a06)" }} />
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-faint)" }}>Loading calendar...</p>
          </div>
        )}
        {calFailed && !calLoaded && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-accent)" }}>
              Calendar couldn&apos;t load.
            </p>
            <a
              href={CAL_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="home-link inline-flex items-center gap-2"
              style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}
            >
              Book directly on Cal.com <span aria-hidden="true">→</span>
            </a>
          </div>
        )}
      </div>

      <a
        href={CAL_BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="home-link inline-flex items-center gap-2 mt-4"
        style={{ fontSize: 13, fontWeight: 500, color: "var(--text-dim)" }}
      >
        Open in new tab <span aria-hidden="true">→</span>
      </a>

      <div className="mt-6 flex flex-col gap-2.5 pt-5" style={{ borderTop: "1px solid var(--line-dim)" }}>
        {TRUST_SIGNALS.map((signal) => (
          <p key={signal} className="flex items-center gap-2.5" style={{ fontSize: 13, color: "var(--text-dim)" }}>
            <span
              aria-hidden="true"
              style={{ display: "inline-block", width: 6, height: 6, background: "var(--text)", flexShrink: 0 }}
            />
            {signal}
          </p>
        ))}
      </div>
    </div>
  );
}
