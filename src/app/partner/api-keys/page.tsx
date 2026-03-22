"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Key,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  last_used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
  request_count?: number;
}

export default function ApiKeysPage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!session) return;
    try {
      const res = await authFetch("/api/v1/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {
      // handled by authFetch
    }
    setLoading(false);
  }, [session, authFetch]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: keyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.key) {
          setCreatedKey(data.key);
        }
        setKeyName("");
        setShowCreate(false);
        fetchKeys();
      }
    } catch {
      // handled by authFetch
    }
    setCreating(false);
  };

  const revokeKey = async (id: string) => {
    try {
      await authFetch(`/api/v1/api-keys?id=${id}`, { method: "DELETE" });
      fetchKeys();
    } catch {
      // handled by authFetch
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#6E6E73]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#A1A1A6]">
          {keys.filter((k) => !k.revoked).length} active{" "}
          {keys.filter((k) => !k.revoked).length === 1 ? "key" : "keys"}
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {createdKey && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="mb-2 text-sm font-medium text-emerald-400">
            New API Key Created — copy it now, it will not be shown again:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg border border-emerald-500/20 bg-[#0A0A0A] px-3 py-2 font-mono text-sm text-[#F5F5F7]">
              {createdKey}
            </code>
            <button
              onClick={() => copyToClipboard(createdKey)}
              className="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10"
            >
              {copied ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey("")}
            className="mt-2 text-xs text-[#6E6E73] hover:text-[#A1A1A6]"
          >
            Dismiss
          </button>
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={createKey}
          className="rounded-xl border border-white/[0.06] bg-[#111111] p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#F5F5F7]">
              Create API Key
            </h3>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-[#6E6E73] hover:text-[#A1A1A6]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Key name (e.g., Production, Staging)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] px-4 py-2.5 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none focus:border-[#3B82F6]"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !keyName.trim()}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB] disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Create Key"
            )}
          </button>
        </form>
      )}

      {keys.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#111111] py-16 text-center">
          <Key className="mx-auto mb-3 h-8 w-8 text-[#6E6E73]" />
          <p className="text-sm text-[#A1A1A6]">No API keys yet</p>
          <p className="mt-1 text-xs text-[#6E6E73]">
            Create your first API key to start integrating
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div
              key={k.id}
              className={`rounded-xl border p-4 ${
                k.revoked
                  ? "border-red-500/10 bg-red-500/5 opacity-60"
                  : "border-white/[0.06] bg-[#111111]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#F5F5F7]">
                      {k.name}
                    </span>
                    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-[#6E6E73]">
                      {k.key_prefix}...
                    </code>
                    {k.revoked && (
                      <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400">
                        Revoked
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[#6E6E73]">
                    <span>{k.scopes.length} scopes</span>
                    <span>{k.rate_limit} req/min</span>
                    {k.request_count !== undefined && (
                      <span>{k.request_count.toLocaleString()} requests</span>
                    )}
                    {k.last_used_at && (
                      <span>
                        Last used{" "}
                        {new Date(k.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                    <span>
                      Created {new Date(k.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {!k.revoked && (
                  <button
                    onClick={() => revokeKey(k.id)}
                    className="rounded-lg p-2 text-[#6E6E73] transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {k.scopes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {k.scopes.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[#6E6E73]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Usage hint */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#F5F5F7]">
          Authentication
        </h3>
        <div className="rounded-lg bg-[#0A0A0A] p-4">
          <p className="mb-1 text-xs text-[#6E6E73]">
            Include your API key in the Authorization header:
          </p>
          <code className="text-sm text-emerald-400">
            Authorization: Bearer sk_live_your_key_here
          </code>
        </div>
      </div>
    </div>
  );
}
