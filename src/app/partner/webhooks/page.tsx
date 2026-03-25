"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Plus,
  Send,
  Trash2,
  Webhook,
  X,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  last_status: number | null;
  created_at: string;
}

interface DeliveryLog {
  id: string;
  webhook_id: string;
  event: string;
  status: number;
  response_time_ms: number;
  created_at: string;
}

const EVENTS = [
  "lead.created",
  "lead.updated",
  "unit.updated",
  "facility.updated",
  "special.created",
  "special.updated",
];

export default function WebhooksPage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    success?: boolean;
    error?: string;
  } | null>(null);

  const fetchWebhooks = useCallback(async () => {
    if (!session) return;
    try {
      const [whRes, logRes] = await Promise.allSettled([
        authFetch("/api/v1/webhooks"),
        authFetch("/api/v1/webhooks?type=logs"),
      ]);

      if (whRes.status === "fulfilled" && whRes.value.ok) {
        const data = await whRes.value.json();
        setWebhooks(data.webhooks || []);
      }

      if (logRes.status === "fulfilled" && logRes.value.ok) {
        const data = await logRes.value.json();
        setDeliveryLogs(data.logs || []);
      }
    } catch {
      // handled by authFetch
    }
    setLoading(false);
  }, [session, authFetch]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const createWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || newEvents.length === 0) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({ url: newUrl.trim(), events: newEvents }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.webhook?.secret) {
          setWebhookSecret(data.webhook.secret);
        }
        setNewUrl("");
        setNewEvents([]);
        setShowCreate(false);
        fetchWebhooks();
      }
    } catch {
      // handled by authFetch
    }
    setCreating(false);
  };

  const deleteWebhook = async (id: string) => {
    try {
      await authFetch(`/api/v1/webhooks?id=${id}`, { method: "DELETE" });
      fetchWebhooks();
    } catch {
      // handled by authFetch
    }
  };

  const testWebhook = async (id: string) => {
    setTestResult({ id });
    try {
      const res = await authFetch(`/api/v1/webhooks?id=${id}&action=test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult({ id, success: data.success, error: data.error });
    } catch {
      setTestResult({ id, success: false, error: "Network error" });
    }
    setTimeout(() => setTestResult(null), 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleEvent = (evt: string) => {
    setNewEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt],
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-mid-gray)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-body-text)]">
          {webhooks.filter((w) => w.active).length} active{" "}
          {webhooks.filter((w) => w.active).length === 1
            ? "webhook"
            : "webhooks"}
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)] px-3 py-2 text-sm font-medium text-[var(--color-dark)] transition-colors hover:bg-[var(--color-gold-hover)]"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

      {webhookSecret && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="mb-2 text-sm font-medium text-emerald-400">
            Webhook signing secret — copy it now:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg border border-emerald-500/20 bg-[var(--color-light)] px-3 py-2 font-mono text-xs text-[var(--color-dark)]">
              {webhookSecret}
            </code>
            <button
              onClick={() => copyToClipboard(webhookSecret)}
              className="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10"
            >
              {copied ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-mid-gray)]">
            Use this to verify webhook signatures via HMAC-SHA256. Payloads are
            signed with the X-StorageAds-Signature header.
          </p>
          <button
            onClick={() => setWebhookSecret("")}
            className="mt-2 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={createWebhook}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">
              Register Webhook
            </h3>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-4">
            <input
              type="url"
              placeholder="https://your-system.com/webhooks/storageads"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] outline-none focus:border-[var(--color-gold)]"
            />
          </div>
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-[var(--color-body-text)]">Events</p>
            <div className="flex flex-wrap gap-1.5">
              {EVENTS.map((evt) => (
                <button
                  key={evt}
                  type="button"
                  onClick={() => toggleEvent(evt)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    newEvents.includes(evt)
                      ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                      : "border-[var(--border-subtle)] text-[var(--color-mid-gray)] hover:border-[var(--border-medium)]"
                  }`}
                >
                  {evt}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !newUrl.trim() || newEvents.length === 0}
            className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-dark)] transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Register Webhook"
            )}
          </button>
        </form>
      )}

      {webhooks.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-16 text-center">
          <Webhook className="mx-auto mb-3 h-8 w-8 text-[var(--color-mid-gray)]" />
          <p className="text-sm text-[var(--color-body-text)]">No webhooks registered</p>
          <p className="mt-1 text-xs text-[var(--color-mid-gray)]">
            Register a webhook to receive real-time event notifications
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className={`rounded-xl border ${
                wh.active
                  ? "border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                  : "border-[var(--border-subtle)] bg-[var(--color-light)] opacity-60"
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      onClick={() =>
                        setExpandedWebhook(
                          expandedWebhook === wh.id ? null : wh.id,
                        )
                      }
                      className="text-[var(--color-mid-gray)]"
                    >
                      {expandedWebhook === wh.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        wh.active
                          ? wh.failure_count > 5
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                          : "bg-[var(--color-mid-gray)]"
                      }`}
                    />
                    <code className="truncate font-mono text-sm text-[var(--color-dark)]">
                      {wh.url}
                    </code>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => testWebhook(wh.id)}
                      title="Send test ping"
                      className="rounded-lg p-1.5 text-[var(--color-mid-gray)] transition-colors hover:bg-[var(--color-gold)]/10 hover:text-[var(--color-gold)]"
                    >
                      {testResult?.id === wh.id && testResult.success === false ? (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      ) : testResult?.id === wh.id && testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : testResult?.id === wh.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteWebhook(wh.id)}
                      title="Delete webhook"
                      className="rounded-lg p-1.5 text-[var(--color-mid-gray)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="ml-6 mt-1.5 flex items-center gap-3 text-xs text-[var(--color-mid-gray)]">
                  <span>{wh.events.length} events</span>
                  {wh.failure_count > 0 && (
                    <span className="text-amber-400">
                      {wh.failure_count} failures
                    </span>
                  )}
                  {wh.last_triggered_at && (
                    <span>
                      Last fired{" "}
                      {new Date(wh.last_triggered_at).toLocaleDateString()}
                    </span>
                  )}
                  {wh.last_status && <span>HTTP {wh.last_status}</span>}
                </div>
              </div>
              {expandedWebhook === wh.id && (
                <div className="border-t border-[var(--border-subtle)] bg-[var(--color-light-gray)]/20 px-4 py-3">
                  <p className="mb-1.5 text-xs font-medium text-[var(--color-body-text)]">
                    Subscribed Events
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((e) => (
                      <span
                        key={e}
                        className="rounded bg-[var(--color-gold)]/10 px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-gold)]"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delivery Log */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-dark)]">
          Delivery Log
        </h3>
        {deliveryLogs.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--color-mid-gray)]">No deliveries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-mid-gray)]">
                    Event
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                    Latency
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {deliveryLogs.slice(0, 20).map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-xs text-[var(--color-body-text)]">
                        {log.event}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`font-mono text-xs ${
                          log.status >= 200 && log.status < 300
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-[var(--color-mid-gray)]">
                      {log.response_time_ms}ms
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-[var(--color-mid-gray)]">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
