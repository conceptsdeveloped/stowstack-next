"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Send,
  Link2,
  Unlink,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Plug,
  Shield,
  X,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────── */

interface MetaAdContent {
  angle: string;
  angleLabel: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  targetingNote: string;
}

interface AdVariation {
  id: string;
  facility_id: string;
  brief_id: string | null;
  created_at: string;
  platform: string;
  format: string;
  angle: string;
  content_json: MetaAdContent | Record<string, unknown>;
  asset_urls: Record<string, string> | null;
  status: string;
  feedback: string | null;
  version: number;
}

interface Asset {
  id: string;
  facility_id: string;
  created_at: string;
  type: string;
  source: string;
  url: string;
  metadata: Record<string, unknown> | null;
}

interface PlatformInfo {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  connectUrl: string | null;
  icon: string;
}

interface PlatformConnection {
  id: string;
  facility_id: string;
  platform: string;
  status: string;
  account_id: string | null;
  account_name: string | null;
  page_id: string | null;
  page_name: string | null;
  created_at: string;
  updated_at: string;
  token_expires_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface PublishLogEntry {
  id: string;
  facility_id: string;
  variation_id: string;
  connection_id: string;
  platform: string;
  status: string;
  external_id: string | null;
  external_url: string | null;
  error_message: string | null;
  created_at: string;
  content_json: Record<string, string> | null;
  angle: string | null;
}

/* ── Constants ───────────────────────────────────────────────── */

const PLATFORM_COLORS: Record<string, string> = {
  meta: "bg-[var(--color-gold)]",
  google: "bg-red-500",
  tiktok: "bg-black border border-[var(--border-medium)]",
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  google: "Google Ads",
  tiktok: "TikTok",
};

const PLATFORM_LETTERS: Record<string, string> = {
  meta: "M",
  google: "G",
  tiktok: "T",
};

const PUBLISH_STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-400",
  success: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
  pending: "bg-yellow-500/10 text-yellow-400",
};

/* ── Main Component ──────────────────────────────────────────── */

export default function AdPublisher({
  facilityId,
  adminKey,
}: {
  facilityId: string;
  adminKey: string;
}) {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [publishLog, setPublishLog] = useState<PublishLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [ctaOverride, setCtaOverride] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/platform-connections?facilityId=${facilityId}`, {
        headers: { "X-Admin-Key": adminKey },
      }).then((r) => r.json()),
      fetch(`/api/facility-creatives?facilityId=${facilityId}`, {
        headers: { "X-Admin-Key": adminKey },
      }).then((r) => r.json()),
      fetch(`/api/facility-assets?facilityId=${facilityId}`, {
        headers: { "X-Admin-Key": adminKey },
      }).then((r) => r.json()),
      fetch(`/api/publish-ad?facilityId=${facilityId}`, {
        headers: { "X-Admin-Key": adminKey },
      }).then((r) => r.json()),
    ])
      .then(([connData, creativeData, assetData, logData]) => {
        if (connData.platforms) setPlatforms(connData.platforms);
        if (connData.connections) {
          setConnections(connData.connections);
          const firstConnected = connData.connections.find(
            (c: PlatformConnection) => c.status === "connected"
          );
          if (firstConnected) setSelectedConnection(firstConnected.id);
        }
        if (creativeData.variations) {
          const approved = creativeData.variations.filter(
            (v: AdVariation) =>
              v.status === "approved" || v.status === "published"
          );
          setVariations(approved);
          if (approved.length) setSelectedVariation(approved[0].id);
        }
        if (assetData.assets) {
          const photos = assetData.assets.filter(
            (a: Asset) => a.type === "photo"
          );
          setAssets(photos);
          if (photos.length) setSelectedImage(photos[0].url);
        }
        if (logData.logs) setPublishLog(logData.logs);
      })
      .catch(() => { setError('Failed to load publisher data. Please try refreshing the page.'); })
      .finally(() => setLoading(false));
  }, [facilityId, adminKey]);

  function getConnection(platform: string) {
    return connections.find(
      (c) => c.platform === platform && c.status === "connected"
    );
  }

  function isTokenExpiring(conn: PlatformConnection): boolean {
    if (!conn.token_expires_at) return false;
    const expiresAt = new Date(conn.token_expires_at).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return expiresAt - Date.now() < sevenDays;
  }

  async function disconnect(connectionId: string) {
    setDisconnecting(connectionId);
    try {
      await fetch("/api/platform-connections", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ connectionId }),
      });
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId ? { ...c, status: "disconnected" } : c
        )
      );
    } catch {
      setError('Failed to disconnect platform. Please try again.');
    } finally {
      setDisconnecting(null);
    }
  }

  async function publishAd() {
    if (!selectedVariation || !selectedConnection) return;
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);
    try {
      const res = await fetch("/api/publish-ad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          variationId: selectedVariation,
          connectionId: selectedConnection,
          imageUrl: selectedImage || undefined,
          ctaOverride: ctaOverride || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishSuccess(
          data.externalUrl
            ? "Ad published! View in Ads Manager."
            : "Ad published successfully!"
        );
        const logRes = await fetch(
          `/api/publish-ad?facilityId=${facilityId}`,
          { headers: { "X-Admin-Key": adminKey } }
        );
        const logData = await logRes.json();
        if (logData.logs) setPublishLog(logData.logs);
      } else {
        setPublishError(
          data.details ||
            data.error ||
            "Publishing failed -- check Ads Manager for details."
        );
      }
    } catch (err) {
      setPublishError(
        err instanceof Error
          ? err.message
          : "Network error -- could not reach publish API."
      );
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    );
  }

  const connectedPlatforms = connections.filter(
    (c) => c.status === "connected"
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 mb-4">
          <p className="flex-1 text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Platform Connections */}
      <div>
        <h4 className="text-sm font-semibold text-[var(--color-dark)] mb-3 flex items-center gap-2">
          <Plug size={14} className="text-[var(--color-gold)]" />
          Platform Connections
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const conn = getConnection(platform.id);
            const expiring = conn ? isTokenExpiring(conn) : false;
            return (
              <div
                key={platform.id}
                className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${PLATFORM_COLORS[platform.id] || "bg-[var(--color-gold)]"}`}
                  >
                    {PLATFORM_LETTERS[platform.id] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-dark)]">
                      {platform.name}
                    </p>
                    <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">
                      {platform.description}
                    </p>

                    {conn ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <span className="text-xs font-medium text-emerald-400">
                            Connected
                          </span>
                        </div>
                        {conn.account_name && (
                          <p className="text-xs text-[var(--color-mid-gray)]">
                            Account: {conn.account_name}
                          </p>
                        )}
                        {conn.page_name && (
                          <p className="text-xs text-[var(--color-mid-gray)]">
                            Page: {conn.page_name}
                          </p>
                        )}
                        {conn.token_expires_at && (
                          <div className="flex items-center gap-1">
                            {expiring ? (
                              <AlertTriangle
                                size={10}
                                className="text-amber-400"
                              />
                            ) : (
                              <Clock size={10} className="text-[var(--color-mid-gray)]" />
                            )}
                            <p
                              className={`text-[10px] ${expiring ? "text-amber-400" : "text-[var(--color-mid-gray)]"}`}
                            >
                              Token expires:{" "}
                              {new Date(
                                conn.token_expires_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        <button
                          onClick={() => disconnect(conn.id)}
                          disabled={disconnecting === conn.id}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors"
                        >
                          <Unlink size={10} />
                          {disconnecting === conn.id
                            ? "Disconnecting..."
                            : "Disconnect"}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        {platform.configured ? (
                          <a
                            href={platform.connectUrl || "#"}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] transition-colors"
                          >
                            <Link2 size={12} />
                            Connect{" "}
                            {PLATFORM_LABELS[platform.id] || platform.name}
                          </a>
                        ) : (
                          <div className="p-3 rounded-lg border border-dashed border-[var(--border-medium)]">
                            <div className="flex items-start gap-2">
                              <Shield
                                size={12}
                                className="text-[var(--color-mid-gray)] mt-0.5 shrink-0"
                              />
                              <div>
                                <p className="text-xs text-[var(--color-mid-gray)]">
                                  {platform.id === "meta"
                                    ? "Requires META_APP_ID and META_APP_SECRET environment variables."
                                    : platform.id === "tiktok"
                                      ? "Requires TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET environment variables."
                                      : "Requires GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, and GOOGLE_ADS_DEVELOPER_TOKEN environment variables."}
                                </p>
                                <p className="text-[10px] text-[var(--color-mid-gray)] mt-1">
                                  Add these in Vercel &rarr; Settings &rarr;
                                  Environment Variables
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {platforms.length === 0 && (
            <div className="col-span-full text-center py-8 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
              <Plug size={24} className="mx-auto mb-2 text-[var(--color-mid-gray)]" />
              <p className="text-sm text-[var(--color-mid-gray)]">
                No platform configurations found.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Publish Controls */}
      {connectedPlatforms.length > 0 && variations.length > 0 && (
        <div className="border border-[var(--border-subtle)] rounded-xl p-5 bg-[var(--bg-elevated)]">
          <h4 className="text-sm font-semibold text-[var(--color-dark)] mb-4 flex items-center gap-2">
            <Send size={14} className="text-[var(--color-gold)]" />
            Publish an Ad
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ad Variation selector */}
            <div>
              <label className="text-xs font-medium text-[var(--color-mid-gray)] block mb-1.5">
                Ad Copy
              </label>
              <select
                value={selectedVariation}
                onChange={(e) => setSelectedVariation(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
              >
                {variations.map((v) => {
                  const c = v.content_json as MetaAdContent;
                  return (
                    <option key={v.id} value={v.id}>
                      {c.angleLabel || v.angle} &mdash;{" "}
                      {c.headline?.slice(0, 30)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Platform selector */}
            <div>
              <label className="text-xs font-medium text-[var(--color-mid-gray)] block mb-1.5">
                Platform
              </label>
              <select
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
              >
                <option value="">Select platform...</option>
                {connectedPlatforms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {PLATFORM_LABELS[c.platform] || c.platform} &mdash;{" "}
                    {c.account_name || c.account_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Image selector */}
            <div>
              <label className="text-xs font-medium text-[var(--color-mid-gray)] block mb-1.5">
                Image
              </label>
              <select
                value={selectedImage}
                onChange={(e) => setSelectedImage(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
              >
                <option value="">No image</option>
                {assets.map((a, i) => (
                  <option key={a.id} value={a.url}>
                    {a.source === "website_scrape"
                      ? "Scraped"
                      : a.source === "stock_library"
                        ? "Stock"
                        : "Uploaded"}{" "}
                    image {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* CTA Override */}
            <div>
              <label className="text-xs font-medium text-[var(--color-mid-gray)] block mb-1.5">
                CTA Override
              </label>
              <input
                value={ctaOverride}
                onChange={(e) => setCtaOverride(e.target.value)}
                placeholder="Optional custom CTA..."
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light)] text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={publishAd}
                disabled={
                  !selectedVariation || !selectedConnection || publishing
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
              >
                {publishing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Publishing...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Publish Ad
                  </>
                )}
              </button>
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt=""
                  className="h-10 w-16 object-cover rounded border border-[var(--border-subtle)]"
                />
              )}
            </div>
            <p className="text-xs text-[var(--color-mid-gray)]">
              Ad will be created as{" "}
              <span className="font-semibold text-[var(--color-body-text)]">PAUSED</span> in
              Ads Manager. Review targeting and budget there, then activate when
              ready.
            </p>

            {publishError && (
              <div className="flex items-start gap-2 p-3 rounded-lg border bg-red-500/5 border-red-500/20">
                <XCircle
                  size={14}
                  className="text-red-400 mt-0.5 shrink-0"
                />
                <div>
                  <p className="font-medium text-xs text-red-400 mb-0.5">
                    Publish Failed
                  </p>
                  <p className="text-xs text-red-300">{publishError}</p>
                </div>
              </div>
            )}
            {publishSuccess && (
              <div className="flex items-start gap-2 p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                <CheckCircle2
                  size={14}
                  className="text-emerald-400 mt-0.5 shrink-0"
                />
                <p className="text-xs text-emerald-300">{publishSuccess}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No approved variations message */}
      {connectedPlatforms.length > 0 && variations.length === 0 && (
        <div className="text-center py-6 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
          <p className="text-sm text-[var(--color-mid-gray)]">
            No approved ad variations yet. Go to the Creative Studio to approve
            some ads first.
          </p>
        </div>
      )}

      {/* Publish History */}
      {publishLog.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-dark)] mb-3 flex items-center gap-2">
            <Clock size={14} className="text-[var(--color-mid-gray)]" />
            Publish History
          </h4>
          <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_100px_80px_80px] gap-3 px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--color-light-gray)]">
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-mid-gray)]" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
                Variation
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
                Date
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
                Status
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
                Link
              </span>
            </div>
            {/* Table rows */}
            {publishLog.map((log) => (
              <div
                key={log.id}
                className="grid grid-cols-[40px_1fr_100px_80px_80px] gap-3 px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0 items-center hover:bg-[var(--color-light-gray)] transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${PLATFORM_COLORS[log.platform] || "bg-[var(--color-gold)]"}`}
                >
                  {PLATFORM_LETTERS[log.platform] || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-dark)] truncate">
                    {log.content_json?.headline ||
                      log.angle ||
                      "Ad variation"}
                  </p>
                  {log.error_message && (
                    <p
                      className="text-[10px] text-red-400 truncate"
                      title={log.error_message}
                    >
                      {log.error_message}
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-[var(--color-mid-gray)]">
                  {new Date(log.created_at).toLocaleDateString()}
                </p>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium text-center ${PUBLISH_STATUS_STYLES[log.status] || "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"}`}
                >
                  {log.status}
                </span>
                <div>
                  {log.external_url && (
                    <a
                      href={log.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-gold)] hover:text-[var(--color-blue)] flex items-center gap-1 transition-colors"
                    >
                      View <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty publish log */}
      {publishLog.length === 0 && connectedPlatforms.length > 0 && (
        <div className="text-center py-6 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
          <Clock size={24} className="mx-auto mb-2 text-[var(--color-mid-gray)]" />
          <p className="text-sm text-[var(--color-mid-gray)]">
            No publish history yet. Publish your first ad above.
          </p>
        </div>
      )}
    </div>
  );
}
