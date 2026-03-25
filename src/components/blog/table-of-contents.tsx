'use client';

import { useState, useEffect } from 'react';
import type { TocItem } from '@/types/blog';

interface TableOfContentsProps {
  items: TocItem[];
}

/**
 * Sticky table of contents for blog posts.
 * Desktop: sticky in left margin. Mobile: collapsible accordion at top.
 * Highlights current section based on scroll position.
 */
export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Track scroll position to highlight active section
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <nav
        className="hidden lg:block sticky top-24 w-56 shrink-0"
        aria-label="Table of contents"
      >
        <p
          className="text-xs font-medium uppercase tracking-wider mb-3"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
        >
          On this page
        </p>
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block text-sm py-1 transition-colors"
                  style={{
                    fontFamily: 'var(--font-body)',
                    color: isActive ? 'var(--color-gold)' : 'var(--color-mid-gray)',
                    fontWeight: isActive ? 500 : 400,
                    paddingLeft: item.level === 3 ? '12px' : '0',
                    borderLeft: isActive ? '2px solid var(--color-gold)' : '2px solid transparent',
                  }}
                >
                  {item.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile: collapsible */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium w-full"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
        >
          <span>Table of Contents</span>
          <span style={{ color: 'var(--color-mid-gray)' }}>{expanded ? '−' : '+'}</span>
        </button>
        {expanded && (
          <ul className="mt-2 space-y-1 pl-3 border-l-2" style={{ borderColor: 'var(--color-light-gray)' }}>
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block text-sm py-0.5"
                  style={{
                    fontFamily: 'var(--font-body)',
                    color: 'var(--color-body-text)',
                    paddingLeft: item.level === 3 ? '12px' : '0',
                  }}
                  onClick={() => setExpanded(false)}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** Extract TOC items from HTML content */
export function extractTocItems(html: string): TocItem[] {
  const items: TocItem[] = [];
  const regex = /<h([23])\s+id="([^"]+)"[^>]*>([^<]+)<\/h[23]>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    items.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].trim(),
    });
  }
  return items;
}
