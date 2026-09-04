"use client";

import { useMemo } from "react";
import { DollarSign, Loader2, RefreshCw, TrendingDown, Users } from "lucide-react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";

/**
 * Portfolio cost per move-in (MISSION.md s8).
 *
 * `/admin/portfolio` reads the pre-aggregated, client-scoped `client_campaigns`
 * table. This is the facility-level view a multi-facility owner actually needs,
 * and it comes from one grouped query rather than one per facility — measured at
 * 27× faster than looping on a twenty-facility portfolio.
 */

interface FacilityRow {
  facility_id: string; facility_name: string | null; spend: number; leads: number;
  move_ins: number; revenue: number; cpl: number; cost_per_move_in: number;
}
interface CampaignRow {
  campaign: string | null; spend: number; leads: number; move_ins: number;
  revenue: number; cost_per_move_in: number;
}
interface Totals {
  facilities: number; spend: number; leads: number; move_ins: number;
  revenue: number; cpl: number; cost_per_move_in: number; roas: number;
}
interface PortfolioResponse {
  facilities: FacilityRow[]; campaigns: CampaignRow[]; totals: Totals;
  dateRange: { start: string; end: string }; hasData: boolean;
}
interface AdminFacility { id: string; name: string }

const money = (n: number) =>
  n >= 1000 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(2).replace(/\.00$/, "")}`;

function Stat({ label, value, hint, icon: Icon }: {
  label: string; value: string; hint?: string; icon: typeof DollarSign;
}) {
  return (
    <div style={{ border: "1px solid var(--color-light-gray)", padding: "1rem 1.1rem", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".4rem", color: "var(--color-mid-gray)" }}>
        <Icon size={13} aria-hidden />
        <span style={{ fontSize: ".7rem", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-.03em", marginTop: ".35rem" }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: ".72rem", color: "var(--color-mid-gray)", marginTop: ".2rem" }}>{hint}</div>}
    </div>
  );
}

const th = (align: "left" | "right" = "left"): React.CSSProperties => ({
  textAlign: align, padding: "0 .8rem .45rem 0", borderBottom: "1.5px solid var(--color-dark)",
  fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
  color: "var(--color-mid-gray)", whiteSpace: "nowrap",
});
const td = (align: "left" | "right" = "left"): React.CSSProperties => ({
  textAlign: align, padding: ".55rem .8rem .55rem 0", borderBottom: "1px solid var(--color-light-gray)",
  fontVariantNumeric: align === "right" ? "tabular-nums" : "normal",
});

export default function PortfolioAttributionPage() {
  const facilities = useAdminFetch<{ facilities: AdminFacility[] }>("/api/admin-facilities");

  const ids = useMemo(
    () => (facilities.data?.facilities ?? []).map((f) => f.id).slice(0, 250).join(","),
    [facilities.data]
  );
  const params = useMemo(() => (ids ? { facilityIds: ids } : undefined), [ids]);
  const { data, loading, error, refetch } = useAdminFetch<PortfolioResponse>(
    "/api/attribution/portfolio",
    params
  );

  if (facilities.loading || (loading && !data)) {
    return (
      <div style={{ padding: "2rem", color: "var(--color-mid-gray)", display: "flex", gap: ".5rem", alignItems: "center" }}>
        <Loader2 size={15} className="animate-spin" aria-hidden /> Loading attribution…
      </div>
    );
  }
  if (!ids) {
    return <div style={{ padding: "2rem", color: "var(--color-mid-gray)" }}>No facilities to report on yet.</div>;
  }
  if (error) {
    return <div style={{ padding: "2rem", color: "var(--color-red)" }}>Could not compute attribution. {error}</div>;
  }

  const t = data?.totals;
  const rows = (data?.facilities ?? []).filter((r) => r.spend > 0 || r.leads > 0);

  return (
    <div style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-.03em", margin: 0 }}>
            Cost per move-in
          </h1>
          <p style={{ margin: ".35rem 0 0", color: "var(--color-body-text)", fontSize: ".85rem", maxWidth: "64ch", lineHeight: 1.6 }}>
            Across every facility, {data?.dateRange.start} to {data?.dateRange.end}. The portfolio figure is
            total spend divided by total move-ins — not the average of each facility&apos;s rate, which would
            weight a small facility the same as a large one.
          </p>
        </div>
        <button onClick={refetch} style={{
          display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".75rem", fontWeight: 600,
          padding: ".5rem .8rem", border: "1px solid var(--color-light-gray)", background: "transparent",
          color: "var(--color-dark)", cursor: "pointer",
        }}>
          <RefreshCw size={13} aria-hidden /> Refresh
        </button>
      </header>

      {!data?.hasData ? (
        <div style={{
          borderLeft: "3px solid var(--color-blue)", background: "var(--color-light-gray)",
          padding: ".85rem 1rem", fontSize: ".84rem", lineHeight: 1.6, maxWidth: "72ch",
        }}>
          <strong>No spend or leads in this window yet.</strong> Ad spend arrives from the Meta sync and
          leads from the landing pages; move-ins are attributed when a lead is matched to a tenant. Once
          any of those start flowing, this fills in on its own.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: ".75rem" }}>
          <Stat label="Cost / move-in" value={t ? money(t.cost_per_move_in) : "—"} hint={`${t?.move_ins ?? 0} move-ins`} icon={TrendingDown} />
          <Stat label="Spend" value={t ? money(t.spend) : "—"} hint={`${t?.facilities ?? 0} facilities`} icon={DollarSign} />
          <Stat label="Leads" value={String(t?.leads ?? 0)} hint={t ? `${money(t.cpl)} per lead` : undefined} icon={Users} />
          <Stat label="ROAS" value={t ? `${t.roas}×` : "—"} hint="annualised revenue / spend" icon={TrendingDown} />
        </div>
      )}

      {rows.length > 0 && (
        <section>
          <h2 style={{ fontSize: ".8rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-mid-gray)", margin: "0 0 .6rem" }}>
            By facility
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem", minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={th()}>Facility</th>
                  <th style={th("right")}>Spend</th>
                  <th style={th("right")}>Leads</th>
                  <th style={th("right")}>Move-ins</th>
                  <th style={th("right")}>Cost / move-in</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.facility_id}>
                    <td style={td()}>{r.facility_name ?? "—"}</td>
                    <td style={td("right")}>{money(r.spend)}</td>
                    <td style={td("right")}>{r.leads}</td>
                    <td style={td("right")}>{r.move_ins}</td>
                    <td style={{ ...td("right"), fontWeight: 600, color: r.move_ins === 0 && r.spend > 0 ? "var(--color-red)" : undefined }}>
                      {/* Spend with no move-ins is the row an operator most needs to see, so it
                          reads as "—" in the error colour rather than a misleading $0. */}
                      {r.move_ins === 0 ? (r.spend > 0 ? "no move-ins" : "—") : money(r.cost_per_move_in)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(data?.campaigns.length ?? 0) > 0 && (
        <section>
          <h2 style={{ fontSize: ".8rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-mid-gray)", margin: "0 0 .6rem" }}>
            By campaign
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem", minWidth: 520 }}>
              <thead>
                <tr>
                  <th style={th()}>Campaign</th>
                  <th style={th("right")}>Spend</th>
                  <th style={th("right")}>Leads</th>
                  <th style={th("right")}>Move-ins</th>
                  <th style={th("right")}>Cost / move-in</th>
                </tr>
              </thead>
              <tbody>
                {data?.campaigns.map((c) => (
                  <tr key={c.campaign ?? "untagged"}>
                    <td style={td()}>{c.campaign ?? <span style={{ color: "var(--color-mid-gray)" }}>untagged</span>}</td>
                    <td style={td("right")}>{money(c.spend)}</td>
                    <td style={td("right")}>{c.leads}</td>
                    <td style={td("right")}>{c.move_ins}</td>
                    <td style={{ ...td("right"), fontWeight: 600 }}>
                      {c.move_ins === 0 ? (c.spend > 0 ? "no move-ins" : "—") : money(c.cost_per_move_in)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
