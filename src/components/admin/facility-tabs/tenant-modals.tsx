"use client";

import { useState } from "react";
import {
  X,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { adminFetch } from "@/hooks/use-admin-fetch";

/* ── form field helper ── */

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:border-[var(--color-gold)]/50 focus:outline-none"
      />
    </div>
  );
}

/* ── add tenant modal ── */

export function AddTenantModal({ facilityId, onClose, onSuccess }: { facilityId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", unit_number: "", unit_size: "", unit_type: "standard",
    monthly_rate: "", move_in_date: new Date().toISOString().split("T")[0],
    autopay_enabled: false, has_insurance: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name || !form.unit_number || !form.monthly_rate) {
      setError("Name, unit number, and rate are required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await adminFetch("/api/tenants", {
        method: "POST",
        body: JSON.stringify({
          facility_id: facilityId,
          ...form,
          monthly_rate: Number(form.monthly_rate),
        }),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add tenant");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-light)] p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Tenant</h3>
          <button onClick={onClose} aria-label="Close" className="text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <Field label="Unit # *" value={form.unit_number} onChange={v => setForm({ ...form, unit_number: v })} />
          <Field label="Unit Size" value={form.unit_size} onChange={v => setForm({ ...form, unit_size: v })} placeholder="e.g. 10x10" />
          <div>
            <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Unit Type</label>
            <select value={form.unit_type} onChange={e => setForm({ ...form, unit_type: e.target.value })} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-[var(--color-gold)]/50 focus:outline-none">
              <option value="standard">Standard</option>
              <option value="climate">Climate Controlled</option>
              <option value="drive_up">Drive-Up</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor / Parking</option>
            </select>
          </div>
          <Field label="Monthly Rate *" value={form.monthly_rate} onChange={v => setForm({ ...form, monthly_rate: v })} type="number" />
          <Field label="Move-In Date" value={form.move_in_date} onChange={v => setForm({ ...form, move_in_date: v })} type="date" />
        </div>
        <div className="mt-3 flex gap-4">
          <label className="flex items-center gap-2 text-xs text-[var(--color-body-text)]">
            <input type="checkbox" checked={form.autopay_enabled} onChange={e => setForm({ ...form, autopay_enabled: e.target.checked })} className="rounded" />
            AutoPay
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--color-body-text)]">
            <input type="checkbox" checked={form.has_insurance} onChange={e => setForm({ ...form, has_insurance: e.target.checked })} className="rounded" />
            Insurance
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-hover)] disabled:opacity-50">
            {submitting ? "Adding..." : "Add Tenant"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── import CSV modal ── */

export function ImportCSVModal({ facilityId, onClose, onSuccess }: { facilityId: string; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [error, setError] = useState("");

  const handleFile = (f: File) => {
    setFile(f);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim());
        if (lines.length < 2) { setError("CSV must have a header row and at least one data row"); return; }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
        const rows = lines.slice(1, 6).map(line => {
          const values = line.split(",").map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = values[i] || ""; });
          return row;
        });
        setPreview(rows);
      } catch {
        setError("Could not parse CSV file");
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim());
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));

        const tenants = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = values[i] || ""; });

          return {
            name: row.name || row.tenant_name || row.tenant || "",
            email: row.email || row.tenant_email || "",
            phone: row.phone || row.tenant_phone || "",
            unit_number: row.unit_number || row.unit || row.space || row.unit_id || "",
            unit_size: row.unit_size || row.size || "",
            unit_type: row.unit_type || row.type || "standard",
            monthly_rate: Number(row.monthly_rate || row.rate || row.rent || 0),
            move_in_date: row.move_in_date || row.move_in || row.start_date || new Date().toISOString().split("T")[0],
            balance: Number(row.balance || row.amount_due || 0),
            autopay_enabled: ["true", "yes", "1"].includes((row.autopay || row.autopay_enabled || "").toLowerCase()),
            external_id: row.external_id || row.id || "",
          };
        }).filter(t => t.name && t.unit_number);

        const res = await adminFetch<{ imported: number; skipped: number; errors: number }>("/api/tenants", {
          method: "POST",
          body: JSON.stringify({ facility_id: facilityId, tenants }),
        });
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
      setImporting(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-2xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-light)] p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Import Tenants from CSV</h3>
          <button onClick={onClose} aria-label="Close" className="text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"><X className="h-5 w-5" /></button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

        {result ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-500/10 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-sm font-medium">Import Complete</p>
              <p className="mt-1 text-xs text-[var(--color-body-text)]">
                {result.imported} imported, {result.skipped} skipped, {result.errors} errors
              </p>
            </div>
            <div className="flex justify-end">
              <button onClick={onSuccess} className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="mb-2 text-xs text-[var(--color-mid-gray)]">Expected columns: name, email, phone, unit_number, unit_size, monthly_rate, move_in_date, balance, autopay</p>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-medium)] p-8 transition-colors hover:border-[var(--color-gold)]/30">
                <Upload className="h-8 w-8 text-[var(--color-mid-gray)]" />
                <span className="text-sm text-[var(--color-body-text)]">{file ? file.name : "Click to select CSV file"}</span>
                <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            </div>

            {preview.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-[var(--color-mid-gray)]">Preview (first {preview.length} rows)</p>
                <div className="max-h-48 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)]">
                        {Object.keys(preview[0]).slice(0, 6).map(h => (
                          <th key={h} className="px-2 py-1.5 text-left text-[var(--color-mid-gray)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-[var(--border-subtle)]">
                          {Object.values(row).slice(0, 6).map((v, j) => (
                            <td key={j} className="px-2 py-1.5 text-[var(--color-body-text)]">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]">Cancel</button>
              <button onClick={handleImport} disabled={!file || importing} className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-hover)] disabled:opacity-50">
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
