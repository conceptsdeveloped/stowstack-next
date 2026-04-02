"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Mail,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

interface OrgUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  org_admin: "Admin",
  facility_manager: "Manager",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  org_admin: "bg-purple-500/10 text-purple-400",
  facility_manager: "bg-[var(--color-blue)]/10 text-[var(--color-blue)]",
  viewer: "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]",
};

export default function TeamPage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    if (!session) return;
    try {
      const res = await authFetch("/api/org-users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // handled by authFetch
    }
    setLoading(false);
  }, [session, authFetch]);

  useEffect(() => {
    fetchUsers(); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch on mount
  }, [fetchUsers]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviting(true);
    setError("");
    try {
      const res = await authFetch("/api/org-users", {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to invite user");
      } else {
        setInviteName("");
        setInviteEmail("");
        setInviteRole("viewer");
        setShowInvite(false);
        fetchUsers();
      }
    } catch {
      setError("Connection error");
    }
    setInviting(false);
  };

  const removeUser = async (userId: string) => {
    if (!session || userId === session.user.id) return;
    try {
      await authFetch(`/api/org-users?id=${userId}`, {
        method: "DELETE",
      });
      fetchUsers();
    } catch {
      // handled by authFetch
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-mid-gray)]" />
      </div>
    );
  }

  const isAdmin = session?.user.role === "org_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-body-text)]">
          {users.length} {users.length === 1 ? "member" : "members"}
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)] px-3 py-2 text-sm font-medium text-[var(--color-dark)] transition-colors hover:bg-[var(--color-gold-hover)]"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        )}
      </div>

      {showInvite && (
        <form
          onSubmit={invite}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">
              Invite Team Member
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowInvite(false);
                setError("");
              }}
              className="text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] outline-none focus:border-[var(--color-gold)]"
            />
            <input
              type="email"
              placeholder="Email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] outline-none focus:border-[var(--color-gold)]"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-gold)]"
            >
              <option value="viewer">Viewer</option>
              <option value="facility_manager">Manager</option>
              <option value="org_admin">Admin</option>
            </select>
          </div>
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}
            className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-dark)] transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
          >
            {inviting ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Send Invite"
            )}
          </button>
        </form>
      )}

      {users.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-16 text-center">
          <UserPlus className="mx-auto mb-3 h-8 w-8 text-[var(--color-mid-gray)]" />
          <p className="text-sm text-[var(--color-body-text)]">No team members yet</p>
          <p className="mt-1 text-xs text-[var(--color-mid-gray)]">
            Invite your first team member to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-light-gray)] text-xs font-semibold text-[var(--color-body-text)]">
                  {u.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-dark)]">
                      {u.name}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ROLE_COLORS[u.role] || ROLE_COLORS.viewer}`}
                    >
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                    {u.status === "invited" && (
                      <span className="text-[10px] font-medium text-amber-400">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--color-mid-gray)]">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {u.email}
                    </span>
                    {u.last_login_at && (
                      <span>
                        Last login{" "}
                        {new Date(u.last_login_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isAdmin && session && u.id !== session.user.id && (
                <button
                  onClick={() => removeUser(u.id)}
                  className="rounded-lg p-2 text-[var(--color-mid-gray)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Remove user"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
