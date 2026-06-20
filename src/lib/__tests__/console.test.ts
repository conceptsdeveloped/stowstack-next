import { describe, it, expect } from "vitest";
import {
  toNumber,
  formatInt,
  formatPercent,
  formatCurrency,
  formatCompactCurrency,
  relativeTime,
  severityCounts,
  campaignAlertsToAttention,
  pmsQueueToAttention,
  stalledLeadsToAttention,
  occupancyInsightsToAttention,
  revenueToAttention,
  rankAttention,
  buildPortfolioPulse,
  buildFacilityPulse,
  STALE_LEAD_DAYS,
  type AttentionItem,
  type CampaignAlertsResponse,
} from "../console";

const NOW = new Date("2026-06-19T12:00:00.000Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe("formatters", () => {
  it("toNumber coerces and rejects", () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber("  ")).toBeNull();
    expect(toNumber("abc")).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber(NaN)).toBeNull();
    expect(toNumber(Infinity)).toBeNull();
  });

  it("formatInt rounds and groups", () => {
    expect(formatInt(1234)).toBe("1,234");
    expect(formatInt(3.7)).toBe("4");
    expect(formatInt("42")).toBe("42");
    expect(formatInt(null)).toBe("—");
    expect(formatInt(NaN)).toBe("—");
  });

  it("formatPercent fixes digits", () => {
    expect(formatPercent("12.5")).toBe("12.5%");
    expect(formatPercent(87.234)).toBe("87.2%");
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(null)).toBe("—");
  });

  it("formatCurrency rounds", () => {
    expect(formatCurrency(1234.6)).toBe("$1,235");
    expect(formatCurrency(null)).toBe("—");
  });

  it("formatCompactCurrency scales", () => {
    expect(formatCompactCurrency(0)).toBe("$0");
    expect(formatCompactCurrency(940)).toBe("$940");
    expect(formatCompactCurrency(8400)).toBe("$8.4k");
    expect(formatCompactCurrency(214000)).toBe("$214k");
    expect(formatCompactCurrency(1_200_000)).toBe("$1.2M");
    expect(formatCompactCurrency(-5000)).toBe("-$5.0k");
    expect(formatCompactCurrency("1234")).toBe("$1.2k");
    expect(formatCompactCurrency(null)).toBe("—");
  });

  it("relativeTime handles past, future, invalid", () => {
    expect(relativeTime(hoursAgo(0.005), NOW)).toBe("just now");
    expect(relativeTime(hoursAgo(3), NOW)).toBe("3h ago");
    expect(relativeTime(daysAgo(3), NOW)).toBe("3d ago");
    expect(relativeTime(new Date(NOW.getTime() + 2 * 3_600_000).toISOString(), NOW)).toBe("in 2h");
    expect(relativeTime("not-a-date", NOW)).toBe("");
    expect(relativeTime(null, NOW)).toBe("");
  });
});

describe("severityCounts", () => {
  it("tallies by band", () => {
    const items: AttentionItem[] = [
      { id: "a", severity: "critical", source: "campaign", facilityName: "", title: "", detail: "", href: "", actionLabel: "" },
      { id: "b", severity: "warning", source: "pms", facilityName: "", title: "", detail: "", href: "", actionLabel: "" },
      { id: "c", severity: "warning", source: "lead", facilityName: "", title: "", detail: "", href: "", actionLabel: "" },
    ];
    expect(severityCounts(items)).toEqual({ total: 3, critical: 1, warning: 2, info: 0 });
  });
});

describe("campaignAlertsToAttention", () => {
  const resp: CampaignAlertsResponse = {
    alerts: [
      { type: "cpl_spike", severity: "critical", title: "CPL spike", detail: "up", metric: 30, facilityName: "Riverside", accessCode: "rv" },
      { type: "roas_low", severity: "warning", title: "ROAS", detail: "low", metric: 1.5, facilityName: "Lakeside", accessCode: "lk" },
      { type: "bogus", severity: "nope" as unknown as "info", title: "x", detail: "y", metric: 0, facilityName: "Lakeside" },
    ],
  };

  it("maps valid alerts and drops invalid severity", () => {
    const items = campaignAlertsToAttention(resp);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ source: "campaign", severity: "critical", facilityName: "Riverside", href: "/admin/campaigns", actionLabel: "Review" });
  });

  it("filters by facility (case-insensitive)", () => {
    const items = campaignAlertsToAttention(resp, { facilityName: "riverside" });
    expect(items).toHaveLength(1);
    expect(items[0].facilityName).toBe("Riverside");
  });

  it("handles null/empty", () => {
    expect(campaignAlertsToAttention(null)).toEqual([]);
    expect(campaignAlertsToAttention({ alerts: [] })).toEqual([]);
  });
});

describe("pmsQueueToAttention", () => {
  it("flags pending and failed, skips processed", () => {
    const items = pmsQueueToAttention({
      reports: [
        { id: "1", status: "pending", facility_name: "Riverside", file_name: "june.csv", uploaded_at: daysAgo(1) },
        { id: "2", status: "failed", facility_name: "Lakeside", file_name: "bad.csv", uploaded_at: daysAgo(2) },
        { id: "3", status: "processed", facility_name: "Riverside", file_name: "done.csv" },
      ],
    });
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.id === "pms:1")).toMatchObject({ severity: "info", actionLabel: "Process" });
    expect(items.find((i) => i.id === "pms:2")).toMatchObject({ severity: "warning", title: "PMS upload failed", actionLabel: "Retry" });
  });

  it("filters by facility", () => {
    const items = pmsQueueToAttention(
      { reports: [{ id: "1", status: "pending", facility_name: "Riverside" }, { id: "2", status: "pending", facility_name: "Lakeside" }] },
      { facilityName: "Lakeside" },
    );
    expect(items).toHaveLength(1);
    expect(items[0].facilityName).toBe("Lakeside");
  });
});

describe("stalledLeadsToAttention", () => {
  it("skips terminal, flags overdue follow-up and quiet leads", () => {
    const items = stalledLeadsToAttention(
      {
        leads: [
          { id: "1", name: "Dana", facilityName: "Riverside", status: "negotiation", followUpDate: daysAgo(2), updatedAt: daysAgo(2) },
          { id: "2", name: "Won Deal", status: "client_signed", followUpDate: daysAgo(9) },
          { id: "3", name: "Quiet", facilityName: "Lakeside", status: "contacted", followUpDate: null, updatedAt: daysAgo(10) },
          { id: "4", name: "Fresh", status: "contacted", followUpDate: null, updatedAt: daysAgo(2) },
        ],
      },
      NOW,
    );
    expect(items.map((i) => i.id)).toEqual(["lead:1:followup", "lead:3:quiet"]);
    expect(items[0]).toMatchObject({ severity: "warning", title: "Follow-up overdue" });
    expect(items[1]).toMatchObject({ severity: "info", title: "Lead gone quiet" });
  });

  it("respects the stale-day threshold boundary", () => {
    const justUnder = stalledLeadsToAttention(
      { leads: [{ id: "1", status: "contacted", updatedAt: daysAgo(STALE_LEAD_DAYS - 1) }] },
      NOW,
    );
    expect(justUnder).toHaveLength(0);
    const atThreshold = stalledLeadsToAttention(
      { leads: [{ id: "1", status: "contacted", updatedAt: daysAgo(STALE_LEAD_DAYS) }] },
      NOW,
    );
    expect(atThreshold).toHaveLength(1);
  });
});

describe("occupancyInsightsToAttention", () => {
  it("maps insight types to severities and skips success", () => {
    const items = occupancyInsightsToAttention(
      {
        insights: [
          { type: "critical", title: "Delinquent", detail: "90+ days" },
          { type: "warning", title: "Gap", detail: "wide" },
          { type: "opportunity", title: "Push rates", detail: "near full" },
          { type: "success", title: "Aligned", detail: "good" },
        ],
      },
      "Riverside",
    );
    expect(items.map((i) => i.severity)).toEqual(["critical", "warning", "info"]);
    expect(items[0]).toMatchObject({ source: "occupancy", href: "/admin/intelligence/occupancy" });
  });
});

describe("revenueToAttention", () => {
  it("flags low health and downward trend by threshold", () => {
    expect(revenueToAttention({ health: { overall: 35 } }, "F")[0]).toMatchObject({ severity: "critical" });
    expect(revenueToAttention({ health: { overall: 55 } }, "F")[0]).toMatchObject({ severity: "warning" });
    expect(revenueToAttention({ health: { overall: 80 } }, "F")).toEqual([]);
    expect(revenueToAttention({ summary: { revenue_trend_pct: -8 } }, "F")[0]).toMatchObject({ title: "Revenue trending down", severity: "warning" });
    expect(revenueToAttention({ summary: { revenue_trend_pct: -20 } }, "F")[0]).toMatchObject({ severity: "critical" });
    expect(revenueToAttention({ summary: { revenue_trend_pct: -2 } }, "F")).toEqual([]);
    expect(revenueToAttention({ summary: { revenue_trend_pct: 5 } }, "F")).toEqual([]);
  });
});

describe("rankAttention", () => {
  const mk = (id: string, severity: AttentionItem["severity"], at?: string): AttentionItem => ({
    id, severity, source: "campaign", facilityName: "", title: "", detail: "", href: "", actionLabel: "", at,
  });

  it("dedups by id, orders by severity then recency, and limits", () => {
    const ranked = rankAttention([
      [mk("a", "info", daysAgo(1)), mk("b", "critical")],
      [mk("b", "critical"), mk("c", "warning", daysAgo(5)), mk("d", "warning", daysAgo(1))],
    ]);
    expect(ranked.map((i) => i.id)).toEqual(["b", "d", "c", "a"]);
    expect(rankAttention([[mk("a", "info"), mk("b", "critical")]], 1).map((i) => i.id)).toEqual(["b"]);
  });
});

describe("buildPortfolioPulse", () => {
  it("includes metrics only when their source exists", () => {
    const metrics = buildPortfolioPulse({
      facilities: [{ id: "1", name: "A", status: "live" }, { id: "2", name: "B", status: "intake" }],
      digest: {
        generatedAt: NOW.toISOString(),
        windows: { day: "", week: "" },
        auditFunnel: { newLeads24h: 3, newLeads7d: 12, converted7d: 2 },
        signedClients: { new24h: 1, new7d: 4 },
        leadStatus7d: {},
      },
      analytics: {
        totalLeads: 120, funnel: { client_signed: 8 }, conversionRate: "6.7", lostRate: "10",
        weeklyVelocity: [{ week: "w1", count: 4 }, { week: "w2", count: 9 }],
      },
      attention: { total: 5, critical: 2, warning: 2, info: 1 },
    });
    const keys = metrics.map((m) => m.key);
    expect(keys).toEqual(["facilities", "leads", "conversion", "signed", "alerts"]);
    expect(metrics.find((m) => m.key === "facilities")).toMatchObject({ value: "2", hint: "1 live" });
    expect(metrics.find((m) => m.key === "leads")?.spark).toEqual([4, 9]);
    expect(metrics.find((m) => m.key === "alerts")?.delta).toMatchObject({ tone: "negative" });
  });

  it("degrades to total leads when digest is missing", () => {
    const metrics = buildPortfolioPulse({
      analytics: { totalLeads: 50, funnel: {}, conversionRate: "0", lostRate: "0", weeklyVelocity: [] },
      attention: { total: 0, critical: 0, warning: 0, info: 0 },
    });
    expect(metrics.find((m) => m.key === "leads")).toMatchObject({ label: "Total leads", value: "50" });
    expect(metrics.find((m) => m.key === "alerts")?.hint).toBe("all clear");
  });

  it("labels info-only attention as 'to review', never 'all clear'", () => {
    const metrics = buildPortfolioPulse({
      analytics: { totalLeads: 1, funnel: {}, conversionRate: "0", lostRate: "0", weeklyVelocity: [] },
      attention: { total: 3, critical: 0, warning: 0, info: 3 },
    });
    const alerts = metrics.find((m) => m.key === "alerts");
    expect(alerts?.value).toBe("3");
    expect(alerts?.hint).toBe("3 to review");
    expect(alerts?.delta).toBeUndefined();
  });
});

describe("buildFacilityPulse", () => {
  it("derives occupancy, capture trend, and health deltas", () => {
    const metrics = buildFacilityPulse({
      occupancy: { facility_level: { physical_occ_pct: 87.2, economic_occ_pct: 82.1, occupancy_gap: 5.1, occupied_units: 218, total_units: 250 } },
      revenue: { summary: { total_actual_revenue: 214000, revenue_capture_pct: 91.4, revenue_trend_pct: -3.2 }, health: { overall: 48 } },
      attention: { total: 1, critical: 0, warning: 1, info: 0 },
    });
    const keys = metrics.map((m) => m.key);
    expect(keys).toEqual(["occupancy", "economic", "capture", "revenue", "health", "alerts"]);
    expect(metrics.find((m) => m.key === "occupancy")).toMatchObject({ value: "87.2%", hint: "218/250 units" });
    expect(metrics.find((m) => m.key === "capture")?.delta).toMatchObject({ direction: "down", tone: "negative", value: "3.2%" });
    expect(metrics.find((m) => m.key === "revenue")?.value).toBe("$214k");
    expect(metrics.find((m) => m.key === "health")?.delta).toMatchObject({ tone: "negative" });
  });

  it("omits metrics whose intelligence is unavailable", () => {
    const metrics = buildFacilityPulse({ attention: { total: 0, critical: 0, warning: 0, info: 0 } });
    expect(metrics.map((m) => m.key)).toEqual(["alerts"]);
  });
});
