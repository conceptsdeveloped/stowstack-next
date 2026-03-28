"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { haptic } from "@/lib/haptics";

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
        haptic("medium");
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
