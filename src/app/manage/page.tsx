"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Mode = "code" | "scratch";

export default function ManageEntryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("code");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // code path
  const [code, setCode] = useState("");

  // scratch path
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/manage/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "That code didn't work. Double-check it and try again.");
        return;
      }
      // Session is set as an httpOnly cookie by the route; nothing to store.
      router.push("/manage/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitScratch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/manage/scratch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          name: name.trim(),
          location: location.trim(),
          contact_email: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Couldn't create your workspace. Check your invite code.");
        return;
      }
      // Session is set as an httpOnly cookie by the route; nothing to store.
      router.push("/manage/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{ fontFamily: "var(--font-inter, system-ui, sans-serif)" }}
      className="min-h-screen bg-[var(--color-light,#faf9f5)] text-[var(--color-dark,#141413)] flex items-center justify-center px-4 py-16"
    >
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <div className="text-2xl font-semibold lowercase tracking-tight">
            storageads
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            Manage your facility
          </h1>
          <p className="mt-2 text-sm text-[var(--color-body-text,#6a6560)] leading-relaxed">
            Access your marketing, analytics, and facility tools in one place.
          </p>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-[var(--color-light-gray,#e8e6dc)] p-1">
          <button
            type="button"
            onClick={() => { setMode("code"); setError(null); }}
            className={`rounded-md py-2 text-sm font-medium transition ${
              mode === "code"
                ? "bg-[var(--color-light,#faf9f5)] shadow-sm"
                : "text-[var(--color-body-text,#6a6560)]"
            }`}
          >
            I have a code
          </button>
          <button
            type="button"
            onClick={() => { setMode("scratch"); setError(null); }}
            className={`rounded-md py-2 text-sm font-medium transition ${
              mode === "scratch"
                ? "bg-[var(--color-light,#faf9f5)] shadow-sm"
                : "text-[var(--color-body-text,#6a6560)]"
            }`}
          >
            Start from scratch
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-[var(--color-red,#B04A3A)] bg-[var(--color-red,#B04A3A)]/10 px-4 py-3 text-sm text-[var(--color-red,#B04A3A)]">
            {error}
          </div>
        )}

        {mode === "code" ? (
          <form onSubmit={submitCode} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Access code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the code from your audit"
                autoComplete="off"
                className="w-full rounded-md border border-[var(--color-light-gray,#e8e6dc)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dark,#141413)]"
              />
              <p className="mt-2 text-xs text-[var(--color-body-text,#6a6560)]">
                If you ran a free audit with us, we already have your facility details. Your code loads them in.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full rounded-md bg-[var(--color-dark,#141413)] py-2.5 text-sm font-semibold text-[var(--color-light,#faf9f5)] disabled:opacity-50"
            >
              {submitting ? "Unlocking…" : "Unlock my tools"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitScratch} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Invite code</label>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Your invite code"
                autoComplete="off"
                className="w-full rounded-md border border-[var(--color-light-gray,#e8e6dc)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dark,#141413)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Facility name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Downtown Self Storage"
                className="w-full rounded-md border border-[var(--color-light-gray,#e8e6dc)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dark,#141413)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
                className="w-full rounded-md border border-[var(--color-light-gray,#e8e6dc)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dark,#141413)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Email <span className="text-[var(--color-body-text,#6a6560)]">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-[var(--color-light-gray,#e8e6dc)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dark,#141413)]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !inviteCode.trim() || !name.trim() || !location.trim()}
              className="w-full rounded-md bg-[var(--color-dark,#141413)] py-2.5 text-sm font-semibold text-[var(--color-light,#faf9f5)] disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create my workspace"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
