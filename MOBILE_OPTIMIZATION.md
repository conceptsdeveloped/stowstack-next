# Mobile Optimization Refinements — StorageAds

Thorough, verbatim instructions for every mobile enhancement. Each section includes the exact file(s) to modify, the code to add or change, and where it goes relative to existing code.

---

## Table of Contents

1. [Safe Area Insets for Notched Devices](#1-safe-area-insets-for-notched-devices)
2. [Service Worker — Offline Shell + Asset Caching](#2-service-worker--offline-shell--asset-caching)
3. [Push Notification Wiring](#3-push-notification-wiring)
4. [Portal Bottom Tab Bar](#4-portal-bottom-tab-bar)
5. [Pull-to-Refresh on Dashboards](#5-pull-to-refresh-on-dashboards)
6. [Touch-Optimized Data Tables](#6-touch-optimized-data-tables)
7. [Skeleton Loading States](#7-skeleton-loading-states)
8. [Responsive Image Sizing](#8-responsive-image-sizing)
9. [Haptic Feedback on Key Actions](#9-haptic-feedback-on-key-actions)
10. [Mobile-Optimized Recharts](#10-mobile-optimized-recharts)

---

## 1. Safe Area Insets for Notched Devices

Modern iPhones (and some Androids) have notches, dynamic islands, and home indicator bars that overlap content. Without `safe-area-inset-*` padding, fixed headers/drawers/bottom navs get clipped.

### Step 1 — Enable `viewport-fit=cover`

**File:** `src/app/layout.tsx`

Find the existing viewport export (line ~54):

```ts
export const viewport: Viewport = {
  themeColor: "#faf9f5",
  width: "device-width",
  initialScale: 1,
};
```

Replace with:

```ts
export const viewport: Viewport = {
  themeColor: "#faf9f5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

This tells the browser to extend the page into the notch/home-indicator area, giving us control over padding.

### Step 2 — Add Safe Area CSS Utilities

**File:** `src/app/globals.css`

At the bottom of the file, inside the existing `/* MOBILE UTILITIES */` section (after the `.scrollbar-hide` rules around line 514), add:

```css
/* ── Safe area insets for notched devices ── */
.safe-top    { padding-top:    env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-left   { padding-left:   env(safe-area-inset-left); }
.safe-right  { padding-right:  env(safe-area-inset-right); }
.safe-x      { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
.safe-y      { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
.safe-all    { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
```

### Step 3 — Apply to Fixed Elements

**File:** `src/components/portal/portal-shell.tsx`

On the `<header>` element (the `PortalHeader` component, line ~355), add `safe-top` class:

```tsx
<header className="safe-top sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--color-light)]/80 px-4 backdrop-blur-xl md:px-6">
```

On the mobile sidebar `<aside>` (line ~330), add `safe-left`:

```tsx
<aside className={`safe-left fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--border-subtle)] bg-[var(--color-light)] transition-transform duration-200 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
```

**File:** `src/components/admin/admin-shell.tsx`

Apply the same `safe-top` and `safe-left` treatment to the admin header and admin sidebar.

**File:** `src/components/partner/partner-shell.tsx`

Same treatment — `safe-top` on the header, `safe-left` on the mobile drawer.

**File:** `src/components/marketing/nav.tsx`

Add `safe-top` to the fixed nav bar, and `safe-left` to the mobile drawer overlay panel.

---

## 2. Service Worker — Offline Shell + Asset Caching

You already have `public/manifest.json` with `"display": "standalone"` but no service worker. This means PWA installs show a blank page when offline. A service worker gives you:
- Cached app shell for instant repeat loads
- Offline fallback page
- Prerequisite for push notifications (Section 3)

### Step 1 — Create the Service Worker

**File:** `public/sw.js` (new file)

```js
const CACHE_NAME = "storageads-v1";
const OFFLINE_URL = "/offline";

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/offline",
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip API routes — always go to network
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

  // Network-first strategy for navigation (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Cache-first strategy for static assets (JS, CSS, images, fonts)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }
});
```

### Step 2 — Create the Offline Fallback Page

**File:** `src/app/offline/page.tsx` (new file)

```tsx
export const metadata = { title: "Offline — StorageAds" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-light)] px-6 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-gold)]/10">
        <svg className="h-8 w-8 text-[var(--color-gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h1 className="mb-2 font-[var(--font-heading)] text-xl font-semibold text-[var(--color-dark)]">
        You&apos;re Offline
      </h1>
      <p className="mb-6 max-w-xs text-sm text-[var(--color-body-text)]">
        It looks like you&apos;ve lost your internet connection. Check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary"
      >
        Retry
      </button>
    </div>
  );
}
```

### Step 3 — Register the Service Worker

**File:** `src/app/layout.tsx`

Add a `<script>` tag inside `<head>` (after the existing `<link rel="manifest" ...>` on line 131):

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js');
        });
      }
    `,
  }}
/>
```

### Step 4 — Update manifest.json

**File:** `public/manifest.json`

Replace contents with:

```json
{
  "name": "StorageAds",
  "short_name": "StorageAds",
  "description": "Full-Funnel Demand Engine for Self-Storage",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#faf9f5",
  "theme_color": "#faf9f5",
  "orientation": "portrait-primary",
  "categories": ["business", "productivity"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

Changes: Added `orientation`, `categories`, and `purpose` on icons so Android generates a proper adaptive icon.

---

## 3. Push Notification Wiring

You already have `web-push@3.6.7` in `package.json`. This section wires it up end-to-end.

### Step 1 — Generate VAPID Keys

Run once locally and save the output to `.env.local`:

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local` (and Vercel env vars):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
```

### Step 2 — Add Push Event Handler to Service Worker

**File:** `public/sw.js`

Append to the bottom of the file:

```js
/* ── Push Notifications ── */

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "StorageAds";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "default",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
```

### Step 3 — Create a Client-Side Subscription Hook

**File:** `src/hooks/use-push-notifications.ts` (new file)

```ts
"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return null;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return null;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    setSubscription(sub);

    // Send subscription to backend
    await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });

    return sub;
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);
      await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    }
  }, [subscription]);

  return { supported, permission, subscription, subscribe, unsubscribe };
}
```

### Step 4 — Create the API Route for Storing Subscriptions

**File:** `src/app/api/push-subscribe/route.ts` (new file)

```ts
import { NextRequest, NextResponse } from "next/server";
import { corsResponse } from "@/lib/api-helpers";
import db from "@/lib/db";

export async function OPTIONS() {
  return corsResponse();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, updatedAt: new Date() },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
```

### Step 5 — Add Prisma Model

**File:** `prisma/schema.prisma`

Add this model alongside the other models:

```prisma
model PushSubscription {
  id        String   @id @default(uuid())
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("push_subscriptions")
}
```

Then run:

```bash
npx prisma generate && npx prisma db push
```

### Step 6 — Server-Side Send Utility

**File:** `src/lib/push.ts` (new file)

```ts
import webpush from "web-push";
import db from "@/lib/db";

webpush.setVapidDetails(
  "mailto:blake@storageads.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToAll(payload: PushPayload) {
  const subs = await db.pushSubscription.findMany();
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .catch(async (err) => {
          // Remove expired subscriptions
          if (err.statusCode === 404 || err.statusCode === 410) {
            await db.pushSubscription.delete({ where: { id: sub.id } });
          }
          throw err;
        })
    )
  );
  return results;
}
```

Usage example (in any API route or cron job):

```ts
import { sendPushToAll } from "@/lib/push";

await sendPushToAll({
  title: "New Lead",
  body: "John Smith requested info for Unit 10x20",
  url: "/portal",
  tag: "new-lead",
});
```

---

## 4. Portal Bottom Tab Bar

The portal sidebar drawer works but requires a hamburger tap every time. A persistent bottom tab bar on mobile is more thumb-friendly and reduces navigation friction for clients checking their dashboards.

### Step 1 — Create the Component

**File:** `src/components/portal/portal-bottom-tabs.tsx` (new file)

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Megaphone, MessageSquare, BarChart3, Settings } from "lucide-react";

const TABS = [
  { label: "Home",      href: "/portal",           icon: LayoutDashboard },
  { label: "Campaigns", href: "/portal/campaigns",  icon: Megaphone },
  { label: "Reports",   href: "/portal/reports",    icon: BarChart3 },
  { label: "Messages",  href: "/portal/messages",   icon: MessageSquare },
  { label: "Settings",  href: "/portal/settings",   icon: Settings },
];

export function PortalBottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--color-light)]/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const isActive = tab.href === "/portal"
            ? pathname === "/portal"
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                isActive
                  ? "text-[var(--color-gold)] font-medium"
                  : "text-[var(--color-mid-gray)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Step 2 — Integrate into Portal Shell

**File:** `src/components/portal/portal-shell.tsx`

Add the import at the top:

```ts
import { PortalBottomTabs } from "./portal-bottom-tabs";
```

In the `PortalShell` return block (line ~439), add the bottom tabs and adjust `<main>` to prevent content from hiding behind the tab bar:

Find:

```tsx
return (
  <PortalCtx.Provider value={{ session, client, authFetch }}>
    <div className="flex h-screen overflow-hidden bg-[var(--color-light)]">
      <Sidebar client={client} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader client={client} onToggle={() => setMobileOpen((v) => !v)} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  </PortalCtx.Provider>
);
```

Replace with:

```tsx
return (
  <PortalCtx.Provider value={{ session, client, authFetch }}>
    <div className="flex h-screen overflow-hidden bg-[var(--color-light)]">
      <Sidebar client={client} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader client={client} onToggle={() => setMobileOpen((v) => !v)} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <PortalBottomTabs />
    </div>
  </PortalCtx.Provider>
);
```

Key changes:
- `pb-16 md:pb-0` on `<main>` — reserves space on mobile so content doesn't hide behind the tab bar. `md:pb-0` removes it on desktop where the sidebar is visible.
- `<PortalBottomTabs />` renders the fixed bottom bar, only visible on `< md` screens.

---

## 5. Pull-to-Refresh on Dashboards

A native-feeling pull-to-refresh gesture for the portal and partner dashboards. This uses the touch events you already have patterns for.

### Step 1 — Create the Hook

**File:** `src/hooks/use-pull-to-refresh.ts` (new file)

```ts
"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;      // px to pull before triggering (default: 80)
  maxPull?: number;        // max pull distance in px (default: 120)
}

export function usePullToRefresh({ onRefresh, threshold = 80, maxPull = 120 }: PullToRefreshOptions) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
      setPulling(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      // Only activate if scrolled to top
      if (el!.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPulling.current) return;
      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      // Only pull downward
      if (diff < 0) {
        isPulling.current = false;
        setPulling(false);
        setPullDistance(0);
        return;
      }

      // Dampen the pull (feels more physical)
      const dampened = Math.min(diff * 0.5, maxPull);
      setPullDistance(dampened);
      setPulling(true);

      // Prevent default scroll while pulling
      if (dampened > 10) e.preventDefault();
    }

    function onTouchEnd() {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistance >= threshold && !refreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
        setPulling(false);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, threshold, maxPull, refreshing, handleRefresh]);

  return { containerRef, pulling, pullDistance, refreshing };
}
```

### Step 2 — Create the Pull Indicator Component

**File:** `src/components/ui/pull-indicator.tsx` (new file)

```tsx
import { Loader2 } from "lucide-react";

interface PullIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  threshold: number;
}

export function PullIndicator({ pullDistance, refreshing, threshold }: PullIndicatorProps) {
  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
      style={{ height: refreshing ? 48 : pullDistance }}
    >
      {refreshing ? (
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-gold)]" />
      ) : (
        <svg
          className="h-5 w-5 text-[var(--color-gold)] transition-transform"
          style={{ transform: `rotate(${rotation}deg)`, opacity: progress }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M12 5v14M5 12l7-7 7 7" />
        </svg>
      )}
    </div>
  );
}
```

### Step 3 — Usage Example in Portal Dashboard

**File:** `src/app/portal/page.tsx`

In any dashboard page, wrap your scrollable content area:

```tsx
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PullIndicator } from "@/components/ui/pull-indicator";

// Inside the component:
const { containerRef, pullDistance, refreshing } = usePullToRefresh({
  onRefresh: async () => {
    // Re-fetch dashboard data
    await refetchData();
  },
});

// In JSX — apply ref to the scrollable container:
<div ref={containerRef as React.RefObject<HTMLDivElement>} className="flex-1 overflow-y-auto">
  <PullIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={80} />
  {/* ...existing dashboard content... */}
</div>
```

---

## 6. Touch-Optimized Data Tables

Admin has dense tables (facilities, leads, campaigns). On mobile these need horizontal scroll with a sticky first column, and optionally a card-view toggle.

### Step 1 — Create a Mobile Table Wrapper

**File:** `src/components/ui/mobile-table.tsx` (new file)

```tsx
"use client";

import { useState } from "react";
import { LayoutList, Table2 } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  sticky?: boolean;                       // sticky first column
  render: (row: T) => React.ReactNode;
  renderCard?: (row: T) => React.ReactNode; // optional card-mode override
}

interface MobileTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  cardRenderer?: (row: T) => React.ReactNode; // full custom card
}

export function MobileTable<T>({ columns, data, keyExtractor, cardRenderer }: MobileTableProps<T>) {
  const [view, setView] = useState<"table" | "cards">("table");

  return (
    <div>
      {/* View toggle — only on mobile */}
      <div className="mb-3 flex justify-end md:hidden">
        <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`rounded-l-lg px-2.5 py-1.5 text-xs ${
              view === "table"
                ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                : "text-[var(--color-mid-gray)]"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView("cards")}
            className={`rounded-r-lg px-2.5 py-1.5 text-xs ${
              view === "cards"
                ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                : "text-[var(--color-mid-gray)]"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Card view (mobile) */}
      {view === "cards" ? (
        <div className="space-y-3 md:hidden">
          {data.map((row) => (
            <div key={keyExtractor(row)} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
              {cardRenderer ? (
                cardRenderer(row)
              ) : (
                <div className="space-y-2">
                  {columns.map((col) => (
                    <div key={col.key} className="flex items-center justify-between gap-4 text-sm">
                      <span className="shrink-0 text-[var(--color-mid-gray)]">{col.label}</span>
                      <span className="text-right text-[var(--color-dark)]">
                        {col.renderCard ? col.renderCard(row) : col.render(row)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Table view — scrollable on mobile, standard on desktop */}
      <div className={`${view === "cards" ? "hidden md:block" : ""}`}>
        <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[var(--color-mid-gray)] ${
                      col.sticky
                        ? "sticky left-0 z-10 bg-[var(--color-light)]"
                        : ""
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={keyExtractor(row)} className="border-b border-[var(--border-subtle)] last:border-0">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-3 py-3 text-[var(--color-dark)] ${
                        col.sticky
                          ? "sticky left-0 z-10 bg-[var(--color-light)]"
                          : ""
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### Step 2 — Usage Example

Wherever you currently render a `<table>` in admin pages, replace with:

```tsx
import { MobileTable } from "@/components/ui/mobile-table";

<MobileTable
  data={facilities}
  keyExtractor={(f) => f.id}
  columns={[
    { key: "name", label: "Facility", sticky: true, render: (f) => f.name },
    { key: "city", label: "City", render: (f) => f.city },
    { key: "units", label: "Units", render: (f) => f.totalUnits },
    { key: "occ", label: "Occupancy", render: (f) => `${f.occupancy}%` },
    { key: "revenue", label: "Revenue", render: (f) => `$${f.monthlyRevenue}` },
  ]}
/>
```

---

## 7. Skeleton Loading States

Replace spinners with layout-matching skeletons for perceived performance.

### Step 1 — Create a Base Skeleton Primitive

**File:** `src/components/ui/skeleton.tsx` (new file)

```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[var(--color-light-gray)] ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite]"
      />
    </div>
  );
}
```

This reuses the `@keyframes shimmer` already defined in `globals.css` (line ~504).

### Step 2 — Create Dashboard Skeleton

**File:** `src/components/portal/portal-dashboard-skeleton.tsx` (new file)

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function PortalDashboardSkeleton() {
  return (
    <div className="p-4 md:p-6">
      {/* Greeting */}
      <Skeleton className="mb-6 h-8 w-48" />

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="mb-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>

      {/* List rows */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 3 — Usage in Portal

Use React Suspense with loading files. Create a `loading.tsx` file in the route directory:

**File:** `src/app/portal/loading.tsx` (new file)

```tsx
import { PortalDashboardSkeleton } from "@/components/portal/portal-dashboard-skeleton";

export default function PortalLoading() {
  return <PortalDashboardSkeleton />;
}
```

Repeat the pattern for admin routes: `src/app/admin/loading.tsx`, etc. Customize the skeleton layout to match each page's structure.

---

## 8. Responsive Image Sizing

Ensure all `<Image>` components (from `next/image`) serve appropriately sized assets to mobile devices instead of desktop-sized images.

### Audit & Fix Pattern

Search the codebase for all `<Image` usages:

```bash
grep -rn "<Image" src/ --include="*.tsx"
```

For every `<Image>` that does NOT have a `sizes` prop, add one based on its layout context. Common patterns:

**Full-width hero images:**
```tsx
<Image
  src="/hero.png"
  alt="..."
  fill
  sizes="100vw"
  priority
/>
```

**Two-column grid images:**
```tsx
<Image
  src="/feature.png"
  alt="..."
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**Card thumbnails (3-col grid on desktop, 1-col mobile):**
```tsx
<Image
  src="/thumb.png"
  alt="..."
  width={400}
  height={300}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

**Sidebar or small UI images:**
```tsx
<Image
  src="/logo.png"
  alt="..."
  width={120}
  height={40}
  sizes="120px"
/>
```

### Why This Matters

Without `sizes`, Next.js defaults to `100vw`, which means even a tiny sidebar logo can trigger a download of a viewport-width-sized image. On mobile, correct `sizes` can reduce image payloads by 50-80%.

---

## 9. Haptic Feedback on Key Actions

For PWA users on supported devices, subtle vibration on key interactions makes the app feel native.

### Step 1 — Create a Utility

**File:** `src/lib/haptics.ts` (new file)

```ts
/**
 * Trigger haptic feedback if the device supports it.
 * Falls back silently on unsupported browsers.
 *
 * Patterns:
 *   "light"  — 10ms tap (button press, toggle)
 *   "medium" — 20ms tap (form submit, drawer open)
 *   "success" — two quick taps (action completed)
 *   "error"  — long buzz (validation error)
 */
type HapticPattern = "light" | "medium" | "success" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  success: [10, 50, 10],
  error: [50, 30, 50],
};

export function haptic(pattern: HapticPattern = "light") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(PATTERNS[pattern]);
  }
}
```

### Step 2 — Usage Examples

Import and call at interaction points:

**Button clicks:**
```tsx
import { haptic } from "@/lib/haptics";

<button onClick={() => { haptic("light"); doAction(); }}>
  Save
</button>
```

**Form submissions:**
```tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  haptic("medium");
  const res = await submitForm();
  if (res.ok) haptic("success");
  else haptic("error");
}
```

**Drawer open/close (portal-shell.tsx):**
```tsx
import { haptic } from "@/lib/haptics";

// In the toggle handler:
onToggle={() => {
  haptic("light");
  setMobileOpen((v) => !v);
}}
```

**Pull-to-refresh trigger:**
```tsx
if (pullDistance >= threshold && !refreshing) {
  haptic("medium");
  handleRefresh();
}
```

---

## 10. Mobile-Optimized Recharts

You use `recharts@3.8.0` for portal/admin charts. Default Recharts configs render poorly on mobile — labels overlap, tooltips are hard to tap, and fixed heights cause tiny charts.

### Step 1 — Create a Responsive Chart Wrapper

**File:** `src/components/ui/responsive-chart.tsx` (new file)

```tsx
"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer } from "recharts";

interface ResponsiveChartProps {
  children: React.ReactElement;
  mobileHeight?: number;
  desktopHeight?: number;
  aspectRatio?: number; // used on mobile instead of fixed height if provided
}

export function ResponsiveChart({
  children,
  mobileHeight = 220,
  desktopHeight = 350,
  aspectRatio,
}: ResponsiveChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const height = isMobile ? mobileHeight : desktopHeight;

  return (
    <div style={aspectRatio && isMobile ? { aspectRatio } : { height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
```

### Step 2 — Mobile-Friendly Tooltip

**File:** `src/components/ui/chart-tooltip.tsx` (new file)

```tsx
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (value: number) => string;
}

export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium text-[var(--color-dark)]">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[var(--color-body-text)]">{entry.name}:</span>
          <span className="font-medium text-[var(--color-dark)]">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Step 3 — Usage Example

Replace existing chart code with mobile-optimized versions:

```tsx
import { ResponsiveChart } from "@/components/ui/responsive-chart";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

<ResponsiveChart mobileHeight={220} desktopHeight={350}>
  <BarChart data={data}>
    <XAxis
      dataKey="month"
      tick={{ fontSize: 11 }}
      interval="preserveStartEnd"  // prevents label overlap on mobile
    />
    <YAxis
      tick={{ fontSize: 11 }}
      width={40}                   // narrower on mobile
    />
    <Tooltip content={<ChartTooltip formatter={(v) => `$${v.toLocaleString()}`} />} />
    <Bar dataKey="revenue" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveChart>
```

Key mobile adjustments:
- `interval="preserveStartEnd"` on XAxis — only shows first and last labels when space is tight
- `tick={{ fontSize: 11 }}` — smaller but still legible
- `width={40}` on YAxis — prevents the axis from eating chart width on narrow screens
- Custom tooltip with touch-friendly size and brand styling

---

## Implementation Priority

| Priority | Section | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Safe Area Insets | ~30 min | Prevents layout bugs on all modern iPhones |
| 2 | Service Worker | ~1 hr | Unlocks offline + caching + push prerequisite |
| 3 | Portal Bottom Tabs | ~30 min | Biggest UX improvement for portal clients |
| 4 | Skeleton Loading | ~45 min | Perceived performance on slow connections |
| 5 | Push Notifications | ~1.5 hr | Client engagement, lead alerts |
| 6 | Responsive Images | ~30 min | Bandwidth savings, Core Web Vitals |
| 7 | Mobile Tables | ~1 hr | Admin usability on phones/tablets |
| 8 | Mobile Charts | ~45 min | Better reporting UX |
| 9 | Pull-to-Refresh | ~30 min | Native feel for PWA users |
| 10 | Haptic Feedback | ~15 min | Polish, native feel |

---

## Testing Checklist

After implementing each section, verify on actual devices:

- [ ] **iPhone with notch/Dynamic Island** — safe areas render correctly, no content clipping
- [ ] **iPhone SE / small screen** — bottom tabs don't overlap content, tables scroll horizontally
- [ ] **Android Chrome** — PWA install works, push notifications display
- [ ] **iPad** — tablet breakpoints work, charts resize properly
- [ ] **Slow 3G throttle** — skeletons appear, service worker caches assets
- [ ] **Airplane mode** — offline page displays after first visit
- [ ] **Lighthouse mobile audit** — run before/after to measure improvement
- [ ] **`prefers-reduced-motion`** — pull-to-refresh and haptics respect this setting
