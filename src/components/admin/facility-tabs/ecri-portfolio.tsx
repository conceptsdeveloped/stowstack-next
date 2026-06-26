"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useFacility } from "@/lib/facility-context";

interface PortfolioRow {
  facilityId: string;
  facilityName: string;
  location: string | null;
  count: number;
  worked: number;
  totalMonthlyLift: number;
  totalAnnualLift: number;
}

interface PortfolioResponse {
  facilities: PortfolioRow[];
  totalCandidates: number;
  totalMonthlyLift: number;
  totalAnnualLift: number;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default function EcriPortfolio({ adminKey }: { adminKey: string }) {
  const { setFacility } = useFacility();
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ecri/portfolio", {
        headers: { "X-Admin-Key": adminKey },
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || `Request failed (${res.status})`);
      }
      setData((await res.json()) as PortfolioResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ECRI portfolio");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Centered>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ink3)" }} />
        <p style={subtleText}>Aggregating ECRI opportunity across all facilities…</p>
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <AlertCircle className="h-6 w-6" style={{ color: "var(--color-red)" }} />
        <p style={subtleText}>{error}</p>
        <button type="button" onClick={() => fetchData()} style={btnStyle}>
          Try again
        </button>
      </Centered>
    );
  }

  const withOpportunity = data?.facilities.filter((f) => f.count > 0) ?? [];

  return (
    <div style={{ fontFamily: "var(--font)", color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
        <TrendingUp className="h-5 w-5" style={{ color: "var(--ink)" }} />
        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>
          ECRI &mdash; Portfolio Roll-up
        </h1>
      </div>
      <p style={{ ...subtleText, marginBottom: "20px" }}>
        Total existing-customer rate-increase opportunity across every facility.
        Open a facility to work its list.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          padding: "16px 20px",
          background: "var(--card)",
          border: "1px solid var(--bdr-strong)",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <Stat label="Facilities with upside" value={String(withOpportunity.length)} />
        <Stat label="Tenants flagged" value={String(data?.totalCandidates ?? 0)} />
        <Stat label="Monthly lift" value={money(data?.totalMonthlyLift ?? 0)} />
        <Stat label="Annualized lift" value={money(data?.totalAnnualLift ?? 0)} />
      </div>

      {withOpportunity.length === 0 ? (
        <Centered>
          <TrendingUp className="h-7 w-7" style={{ color: "var(--ink3)" }} />
          <p style={{ ...subtleText, maxWidth: "380px" }}>
            No facilities currently have tenants under market. Import tenant data
            or run the sensitivity scorer to surface opportunities.
          </p>
        </Centered>
      ) : (
        <div style={{ border: "1px solid var(--bdr-strong)", borderRadius: "10px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--card)" }}>
                <Th align="left">Facility</Th>
                <Th align="right">Flagged</Th>
                <Th align="right">Worked</Th>
                <Th align="right">Monthly lift</Th>
                <Th align="right">Annual lift</Th>
                <Th align="right"></Th>
              </tr>
            </thead>
            <tbody>
              {withOpportunity.map((f) => (
                <tr key={f.facilityId} style={{ borderTop: "1px solid var(--bdr-strong)" }}>
                  <Td align="left">
                    <div style={{ fontWeight: 600 }}>{f.facilityName}</div>
                    {f.location && (
                      <div style={{ fontSize: "12px", color: "var(--ink3)" }}>{f.location}</div>
                    )}
                  </Td>
                  <Td align="right">{f.count}</Td>
                  <Td align="right">
                    {f.worked} / {f.count}
                  </Td>
                  <Td align="right">{money(f.totalMonthlyLift)}</Td>
                  <Td align="right" strong>
                    {money(f.totalAnnualLift)}
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      onClick={() => setFacility(f.facilityId)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontFamily: "var(--font)",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--ink)",
                        background: "var(--card)",
                        border: "1px solid var(--bdr-strong)",
                        borderRadius: "6px",
                        padding: "4px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const subtleText: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--ink3)",
  lineHeight: 1.5,
  margin: 0,
};

const btnStyle: React.CSSProperties = {
  fontFamily: "var(--font)",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--ink)",
  background: "var(--card)",
  border: "1px solid var(--bdr-strong)",
  borderRadius: "8px",
  padding: "8px 16px",
  cursor: "pointer",
};

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center"
      style={{ fontFamily: "var(--font)" }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--ink3)",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align: "left" | "right" | "center" }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "10px 14px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: "var(--ink3)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  strong,
}: {
  children: React.ReactNode;
  align: "left" | "right" | "center";
  strong?: boolean;
}) {
  return (
    <td
      style={{
        textAlign: align,
        padding: "10px 14px",
        color: "var(--ink)",
        fontWeight: strong ? 700 : 400,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </td>
  );
}
