"use client";

/**
 * Live-data hooks — ported from
 * design_handoff_storageads_theme/reference/src/live-data.jsx
 *
 * Two flavors:
 * 1. **Synthetic** (useLiveChannelsSynthetic, useMovesTapeSynthetic,
 *    useSpendTicker) — plausible fake data drifting on independent
 *    cadences. Used when we want the "liveness" texture without a
 *    real upstream source yet. 1–4s intervals, flash decay 500–600ms.
 *    Cadences intentionally desynchronized so the page feels like
 *    many independent systems, not one master clock.
 *
 * 2. **Server-backed** (usePublicStats, usePublicActivity) —
 *    polls /api/public-stats and /api/public-activity for the real
 *    aggregates already shipped. Same hook contract as synthetic
 *    versions so consumers don't care which feeds them.
 *
 * Respect prefers-reduced-motion: the keyframes handle it globally,
 * but hooks keep updating so numbers stay fresh.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/* ─── constants ─── */

const FACILITIES = [
  { id: "ATX-01", name: "CEDAR BARTON SKWY", city: "AUSTIN, TX" },
  { id: "ATX-03", name: "CEDAR RIVERSIDE", city: "AUSTIN, TX" },
  { id: "PHX-02", name: "REDROCK S. MTN", city: "PHOENIX, AZ" },
  { id: "PHX-04", name: "REDROCK DEER VLY", city: "PHOENIX, AZ" },
  { id: "DAL-01", name: "TRINITY OAK CLIFF", city: "DALLAS, TX" },
  { id: "DAL-02", name: "TRINITY IRVING", city: "DALLAS, TX" },
  { id: "DEN-01", name: "FRONT RNG CHERRY CK", city: "DENVER, CO" },
  { id: "SEA-01", name: "EMERALD BALLARD", city: "SEATTLE, WA" },
  { id: "NSH-01", name: "HARPETH GREEN HL", city: "NASHVILLE, TN" },
  { id: "ORL-01", name: "SUNBELT KISSIMMEE", city: "ORLANDO, FL" },
  { id: "MIA-02", name: "SUNBELT COCONUT GV", city: "MIAMI, FL" },
  { id: "SAT-01", name: "ALAMO WESTOVER", city: "SAN ANTONIO, TX" },
];

const CHANNELS = [
  { id: "GOOG", name: "Google Ads", base: 48900, vol: 0.11 },
  { id: "META", name: "Meta", base: 34200, vol: 0.14 },
  { id: "YELP", name: "Yelp", base: 8450, vol: 0.08 },
  { id: "BING", name: "Bing Ads", base: 12100, vol: 0.09 },
  { id: "DMAIL", name: "Direct Mail", base: 6800, vol: 0.03 },
  { id: "CALL", name: "Call Tracking", base: 4300, vol: 0.06 },
];

export const STAGES = ["IMPR", "CLICK", "LEAD", "MOVE"] as const;

/* ─── useClock — wall clock, 1Hz ─── */

export type ClockState = {
  date: Date;
  hms: string;
  hm: string;
  ymd: string;
  tz: string;
};

export function useClock(): ClockState {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: now,
    hms: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    hm: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    ymd: `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${String(now.getFullYear()).slice(2)}`,
    tz: "CT",
  };
}

/* ─── useLiveChannelsSynthetic — drifting channel spend ─── */

export type ChannelRow = {
  id: string;
  name: string;
  value: number;
  prev: number;
  delta: number;
  flash: "up" | "down" | null;
};

export function useLiveChannelsSynthetic(): ChannelRow[] {
  const [rows, setRows] = useState<ChannelRow[]>(() =>
    CHANNELS.map((c) => ({
      id: c.id,
      name: c.name,
      value: c.base,
      prev: c.base,
      delta: 0,
      flash: null,
    })),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) =>
        prev.map((r) => {
          const c = CHANNELS.find((x) => x.id === r.id);
          if (!c) return r;
          const jitter = (Math.random() - 0.48) * c.vol * c.base * 0.12;
          const next = Math.max(0, r.value + jitter);
          const delta = next - r.value;
          if (Math.abs(delta) < 1) return r;
          return { ...r, prev: r.value, value: next, delta, flash: delta > 0 ? "up" : "down" };
        }),
      );
      setTimeout(() => {
        setRows((prev) => prev.map((r) => (r.flash ? { ...r, flash: null } : r)));
      }, 600);
    }, 2300);
    return () => clearInterval(id);
  }, []);
  return rows;
}

/* ─── useMovesTapeSynthetic — streaming move-in events ─── */

export type MoveEvent = {
  id: string;
  t: string;
  fac: string;
  facName: string;
  city: string;
  src: string;
  unit: string;
  rent: string;
  cac: string;
};

function genMoveEvent(): MoveEvent {
  const f = FACILITIES[Math.floor(Math.random() * FACILITIES.length)];
  const srcs = ["GOOG", "META", "YELP", "BING", "DMAIL", "SEO", "CALL"];
  const units = ["5x5", "5x10", "10x10", "10x15", "10x20", "10x30"];
  const src = srcs[Math.floor(Math.random() * srcs.length)];
  const unit = units[Math.floor(Math.random() * units.length)];
  const rent = 79 + Math.floor(Math.random() * 320);
  const t = new Date(Date.now() - Math.random() * 240_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    id: `${Date.now()}${Math.random().toFixed(4).slice(2)}`,
    t: `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`,
    fac: f.id,
    facName: f.name,
    city: f.city,
    src,
    unit,
    rent: `$${rent}`,
    cac: `$${180 + Math.floor(Math.random() * 420)}`,
  };
}

export function useMovesTapeSynthetic(size = 10): MoveEvent[] {
  const [events, setEvents] = useState<MoveEvent[]>(() =>
    Array.from({ length: size }).map(() => genMoveEvent()),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setEvents((prev) => [genMoveEvent(), ...prev].slice(0, size));
    }, 3800);
    return () => clearInterval(id);
  }, [size]);
  return events;
}

/* ─── useSpendTicker — static label/delta items for marquee ─── */

export type SpendTickerItem = { fac: string; val: string; pct: string; dir: "▲" | "▼" };

export function useSpendTicker(): SpendTickerItem[] {
  const [items] = useState<SpendTickerItem[]>(() => {
    const chunks: SpendTickerItem[] = [];
    for (let i = 0; i < 36; i++) {
      const f = FACILITIES[i % FACILITIES.length];
      const pct = (Math.random() * 6 - 2).toFixed(2);
      const dollars = (Math.random() * 2400 + 100).toFixed(0);
      const dir: "▲" | "▼" = Number(pct) >= 0 ? "▲" : "▼";
      chunks.push({ fac: f.id, val: `$${dollars}`, pct: `${pct}%`, dir });
    }
    return chunks;
  });
  return items;
}

/* ─── useFlashMap — generic per-id flash manager ─── */

export function useFlashMap(
  ms = 500,
): [Record<string, "up" | "down">, (id: string, dir?: "up" | "down") => void] {
  const [map, setMap] = useState<Record<string, "up" | "down">>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const flash = useCallback(
    (id: string, dir: "up" | "down" = "up") => {
      setMap((m) => ({ ...m, [id]: dir }));
      if (timers.current[id]) clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        setMap((m) => {
          const n = { ...m };
          delete n[id];
          return n;
        });
      }, ms);
    },
    [ms],
  );
  return [map, flash];
}

/* ─── Server-backed hooks (real data from existing endpoints) ─── */

export type PublicStats = {
  adsGenerated: number;
  auditsRun: number;
  facilities: number;
  avgCostPerMoveIn: number | null;
  updatedAt?: string;
};

export function usePublicStats(pollMs = 60_000): PublicStats | null {
  const [stats, setStats] = useState<PublicStats | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/public-stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d && !d.error) setStats(d);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);
  return stats;
}

export type PublicActivityEvent = {
  id: string;
  platform: string;
  locale: string | null;
  createdAt: string;
};

export function usePublicActivity(pollMs = 60_000): PublicActivityEvent[] {
  const [events, setEvents] = useState<PublicActivityEvent[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/public-activity")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.events) setEvents(d.events);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);
  return events;
}

/* ─── formatters ─── */

export function fmtMoney(n: number, decimals = 0): string {
  return (
    "$" +
    Number(n).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function fmtNumber(n: number, decimals = 0): string {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
