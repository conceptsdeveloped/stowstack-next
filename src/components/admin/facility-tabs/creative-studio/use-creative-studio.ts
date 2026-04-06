"use client";

import { useState, useEffect, useCallback } from "react";
import type { AdVariation, GenerationPlatform } from "./types";

export function useCreativeStudio(facilityId: string, adminKey: string) {
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genPlatform, setGenPlatform] = useState<GenerationPlatform | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/facility-creatives?facilityId=${facilityId}`, {
      headers: { "X-Admin-Key": adminKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.variations) setVariations(data.variations);
      })
      .catch(() => {
        setError("Failed to load creative variations. Please try refreshing.");
      })
      .finally(() => setLoading(false));
  }, [facilityId, adminKey]);

  const generateCopy = useCallback(
    async (platform: GenerationPlatform, feedbackText?: string) => {
      setGenerating(true);
      setGenPlatform(platform);
      try {
        const body: Record<string, string> = { facilityId, platform };
        if (feedbackText) body.feedback = feedbackText;

        const res = await fetch("/api/facility-creatives", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || `Generation failed (${res.status})`);
          setGenPlatform(null);
          return;
        }
        if (data.variations)
          setVariations((prev) => [...data.variations, ...prev]);
        setGenPlatform(null);
      } catch (_err) {
        setError("Creative generation failed. Please try again.");
        setGenPlatform(null);
      } finally {
        setGenerating(false);
      }
    },
    [facilityId, adminKey]
  );

  function handleUpdate(updated: AdVariation) {
    setVariations((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v))
    );
  }

  async function handleDelete(variationId: string) {
    try {
      await fetch("/api/facility-creatives", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ variationId }),
      });
      setVariations((prev) => prev.filter((v) => v.id !== variationId));
    } catch (_err) {
      setError("Failed to delete variation. Please try again.");
    }
  }

  const platforms = [...new Set(variations.map((v) => v.platform))];
  const statuses = [...new Set(variations.map((v) => v.status))];
  const filtered = variations
    .filter((v) => filterPlatform === "all" || v.platform === filterPlatform)
    .filter((v) => filterStatus === "all" || v.status === filterStatus);
  const approved = variations.filter(
    (v) => v.status === "approved" || v.status === "published"
  ).length;
  const total = variations.length;

  return {
    variations,
    loading,
    generating,
    genPlatform,
    filterPlatform,
    setFilterPlatform,
    filterStatus,
    setFilterStatus,
    error,
    setError,
    generateCopy,
    handleUpdate,
    handleDelete,
    platforms,
    statuses,
    filtered,
    approved,
    total,
  };
}
