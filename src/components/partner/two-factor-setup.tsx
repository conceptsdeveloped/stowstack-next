"use client";

import { useCallback, useState } from "react";
import { Check, Copy, Loader2, Lock, Shield, ShieldCheck, ShieldOff, X } from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

type Step = "idle" | "qr" | "verify" | "backup" | "disable";

interface SetupResponse {
  secret: string;
  qrUri: string;
}

interface ConfirmResponse {
  backupCodes: string[];
}

export function TwoFactorSetup({ enabled: initialEnabled }: { enabled: boolean }) {
  const { authFetch } = usePartnerAuth();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Setup state
  const [secret, setSecret] = useState("");
  const [qrUri, setQrUri] = useState("");

  // Verify state
  const [code, setCode] = useState("");

  // Backup state
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  // Disable state
  const [disableCode, setDisableCode] = useState("");

  const callApi = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await authFetch("/api/2fa", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data: Record<string, unknown> = await res.json();
      if (!res.ok) {
        throw new Error((data.error as string) || "Something went wrong");
      }
      return data;
    },
    [authFetch],
  );

  const handleStartSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const data = (await callApi({ action: "setup" })) as unknown as SetupResponse;
      setSecret(data.secret);
      setQrUri(data.qrUri);
      setStep("qr");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start setup");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Enter a 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = (await callApi({ action: "confirm", code })) as unknown as ConfirmResponse;
      setBackupCodes(data.backupCodes);
      setEnabled(true);
      setStep("backup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      setError("Enter a 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await callApi({ action: "disable", code: disableCode });
      setEnabled(false);
      setStep("idle");
      setDisableCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const copyAllCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  const handleDone = () => {
    setStep("idle");
    setCode("");
    setSecret("");
    setQrUri("");
    setBackupCodes([]);
    setCopiedCodes(false);
    setSavedConfirmed(false);
  };

  const qrImageUrl = qrUri
    ? `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(qrUri)}`
    : "";

  // ----- Enabled idle state -----
  if (enabled && step === "idle") {
    return (
      <div className="rounded-lg border border-[var(--color-light-gray)] bg-[var(--color-light)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#788c5d]/15">
              <ShieldCheck className="h-5 w-5 text-[var(--color-green)]" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-primary)] text-sm font-medium text-[var(--color-dark)]">
                Two-factor authentication is enabled
              </p>
              <p className="text-xs text-[var(--color-body-text)]">
                Your account is protected with TOTP verification.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStep("disable");
              setError("");
            }}
            className="rounded-md border border-[var(--color-light-gray)] px-3 py-1.5 text-xs font-medium text-[var(--color-body-text)] transition-colors hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
          >
            Disable
          </button>
        </div>

        {step === "idle" && null}
      </div>
    );
  }

  // ----- Disable confirmation -----
  if (step === "disable") {
    return (
      <div className="rounded-lg border border-[var(--color-light-gray)] bg-[var(--color-light)] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B04A3A]/10">
            <ShieldOff className="h-5 w-5 text-[var(--color-red)]" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-primary)] text-sm font-medium text-[var(--color-dark)]">
              Disable two-factor authentication
            </p>
            <p className="text-xs text-[var(--color-body-text)]">
              Enter your current authenticator code to confirm.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-[#B04A3A]/10 px-3 py-2 text-xs text-[var(--color-red)]">
            {error}
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="disable-code" className="mb-1 block text-xs font-medium text-[var(--color-body-text)]">
              6-digit code
            </label>
            <input
              id="disable-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded-md border border-[var(--color-light-gray)] bg-white px-3 py-2 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
            />
          </div>
          <button
            onClick={handleDisable}
            disabled={loading || disableCode.length !== 6}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-red)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Disable
          </button>
          <button
            onClick={() => {
              setStep("idle");
              setDisableCode("");
              setError("");
            }}
            className="rounded-md border border-[var(--color-light-gray)] px-4 py-2 text-sm font-medium text-[var(--color-body-text)] transition-colors hover:border-[var(--color-dark)]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ----- Not enabled, idle -----
  if (step === "idle") {
    return (
      <div className="rounded-lg border border-[var(--color-light-gray)] bg-[var(--color-light)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-light-gray)]">
              <Shield className="h-5 w-5 text-[var(--color-body-text)]" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-primary)] text-sm font-medium text-[var(--color-dark)]">
                Two-factor authentication
              </p>
              <p className="text-xs text-[var(--color-body-text)]">
                Add an extra layer of security to your account.
              </p>
            </div>
          </div>
          <button
            onClick={handleStartSetup}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            Enable
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-md bg-[#B04A3A]/10 px-3 py-2 text-xs text-[var(--color-red)]">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ----- QR code step -----
  if (step === "qr") {
    return (
      <div className="rounded-lg border border-[var(--color-light-gray)] bg-[var(--color-light)] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-gold)]/10">
            <Shield className="h-5 w-5 text-[var(--color-gold)]" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-primary)] text-sm font-medium text-[var(--color-dark)]">
              Scan QR code
            </p>
            <p className="text-xs text-[var(--color-body-text)]">
              Open your authenticator app and scan the code below.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* QR code */}
          <div className="flex-shrink-0 rounded-lg border border-[var(--color-light-gray)] bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="Scan this QR code with your authenticator app"
              width={200}
              height={200}
              className="block"
            />
          </div>

          <div className="flex-1 space-y-3">
            {/* Manual entry secret */}
            <div>
              <p className="mb-1 text-xs font-medium text-[var(--color-body-text)]">
                Or enter this key manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="block flex-1 overflow-x-auto rounded-md border border-[var(--color-light-gray)] bg-white px-3 py-2 font-mono text-xs tracking-widest text-[var(--color-dark)]">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(secret)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[var(--color-light-gray)] text-[var(--color-body-text)] transition-colors hover:bg-[var(--color-light-gray)]"
                  aria-label="Copy secret key"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Verify input */}
            <div>
              <label htmlFor="totp-code" className="mb-1 block text-xs font-medium text-[var(--color-body-text)]">
                Enter the 6-digit code from your app:
              </label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                placeholder="000000"
                className="w-full rounded-md border border-[var(--color-light-gray)] bg-white px-3 py-2 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
              />
            </div>

            {error && (
              <div className="rounded-md bg-[#B04A3A]/10 px-3 py-2 text-xs text-[var(--color-red)]">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Verify
              </button>
              <button
                onClick={() => {
                  setStep("idle");
                  setCode("");
                  setError("");
                }}
                className="rounded-md border border-[var(--color-light-gray)] px-4 py-2 text-sm font-medium text-[var(--color-body-text)] transition-colors hover:border-[var(--color-dark)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- Backup codes step -----
  if (step === "backup") {
    return (
      <div className="rounded-lg border border-[var(--color-light-gray)] bg-[var(--color-light)] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#788c5d]/15">
            <ShieldCheck className="h-5 w-5 text-[var(--color-green)]" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-primary)] text-sm font-medium text-[var(--color-dark)]">
              Save your backup codes
            </p>
            <p className="text-xs text-[var(--color-body-text)]">
              Store these codes in a safe place. Each code can only be used once.
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {backupCodes.map((c, i) => (
            <div
              key={i}
              className="rounded-md border border-[var(--color-light-gray)] bg-white px-3 py-2 text-center font-mono text-xs tracking-wider text-[var(--color-dark)]"
            >
              {c}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <button
            onClick={copyAllCodes}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-light-gray)] px-3 py-1.5 text-xs font-medium text-[var(--color-body-text)] transition-colors hover:bg-[var(--color-light-gray)]"
          >
            {copiedCodes ? (
              <>
                <Check className="h-3 w-3 text-[var(--color-green)]" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy all codes
              </>
            )}
          </button>
        </div>

        <div className="mb-4 flex items-start gap-2">
          <input
            type="checkbox"
            id="saved-confirm"
            checked={savedConfirmed}
            onChange={(e) => setSavedConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-gold)]"
          />
          <label htmlFor="saved-confirm" className="text-xs text-[var(--color-body-text)]">
            I have saved these backup codes in a secure location.
          </label>
        </div>

        <button
          onClick={handleDone}
          disabled={!savedConfirmed}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
        >
          Done
        </button>
      </div>
    );
  }

  // Fallback
  return null;
}

// ---------- Login 2FA Prompt ----------

interface TwoFactorLoginProps {
  tempToken: string;
  onSuccess: (data: { token: string; user: Record<string, unknown>; organization: Record<string, unknown> }) => void;
  onCancel: () => void;
}

export function TwoFactorLogin({ tempToken, onSuccess, onCancel }: TwoFactorLoginProps) {
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    try {
      const action = mode === "totp" ? "verify" : "verify-backup";
      const payload =
        mode === "totp"
          ? { action, tempToken, code: code.trim() }
          : { action, tempToken, backupCode: code.trim() };

      const res = await fetch("/api/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      onSuccess(data as { token: string; user: Record<string, unknown>; organization: Record<string, unknown> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-gold)]/10">
          <Shield className="h-6 w-6 text-[var(--color-gold)]" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-primary)] text-lg font-medium text-[var(--color-dark)]">
            Two-factor authentication
          </h2>
          <p className="mt-1 text-sm text-[var(--color-body-text)]">
            {mode === "totp"
              ? "Enter the code from your authenticator app."
              : "Enter one of your backup codes."}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[#B04A3A]/10 px-3 py-2 text-xs text-[var(--color-red)]">
          <X className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tfa-login-code" className="mb-1 block text-xs font-medium text-[var(--color-body-text)]">
            {mode === "totp" ? "6-digit code" : "Backup code"}
          </label>
          <input
            id="tfa-login-code"
            type="text"
            inputMode={mode === "totp" ? "numeric" : "text"}
            autoComplete="one-time-code"
            maxLength={mode === "totp" ? 6 : 8}
            value={code}
            onChange={(e) => {
              const val = mode === "totp" ? e.target.value.replace(/\D/g, "") : e.target.value;
              setCode(val);
              setError("");
            }}
            placeholder={mode === "totp" ? "000000" : "a1b2c3d4"}
            autoFocus
            className="w-full rounded-md border border-[var(--color-light-gray)] bg-white px-3 py-2.5 text-center font-mono text-lg tracking-widest text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full rounded-md bg-[var(--color-gold)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </span>
          ) : (
            "Verify"
          )}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "totp" ? "backup" : "totp");
            setCode("");
            setError("");
          }}
          className="text-xs text-[var(--color-gold)] transition-colors hover:text-[var(--color-gold-hover)]"
        >
          {mode === "totp" ? "Use a backup code instead" : "Use authenticator app"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[var(--color-body-text)] transition-colors hover:text-[var(--color-dark)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
