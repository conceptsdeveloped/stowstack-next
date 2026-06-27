import { describe, it, expect } from "vitest";
import { getSampleAuditData, SAMPLE_AUDIT_SLUG } from "../sample-audit";

/**
 * The sample fixture is wired live into the public /audit/sample demo
 * (src/app/audit/[slug]/page.tsx). A broken fixture = a broken customer-facing
 * page, with no DB or AI to fall back on. These tests guard every field the
 * audit report page reads, so a future edit that breaks the shape fails CI
 * instead of silently breaking the demo.
 */

const GRADES = ["A", "B", "C", "D", "F"];
const PRIORITIES = ["high", "medium", "low"];
const FUNNEL_STATUSES = ["strong", "weak", "critical"];
const ALIGNMENT_ACCURACY = ["accurate", "partially_accurate", "misdiagnosed"];
const CANONICAL_SLUGS = [
  "occupancy",
  "lead-generation",
  "sales",
  "marketing",
  "digital-presence",
  "revenue",
  "operations",
  "competition",
];

describe("SAMPLE_AUDIT_SLUG", () => {
  it("is the slug the [slug] route special-cases", () => {
    expect(SAMPLE_AUDIT_SLUG).toBe("sample");
  });
});

describe("getSampleAuditData", () => {
  it("returns a populated AuditData wrapper", () => {
    const data = getSampleAuditData();
    expect(data.facilityName).toBeTruthy();
    expect(typeof data.views).toBe("number");
    expect(data.audit).toBeTruthy();
  });

  it("never renders as expired (expiresAt is always in the future)", () => {
    // The report page shows an "Audit Expired" screen when daysUntil(expiresAt) <= 0.
    // The fixture computes expiresAt relative to now, so this must always hold.
    const { createdAt, expiresAt } = getSampleAuditData();
    const now = Date.now();
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(now);
    expect(new Date(createdAt).getTime()).toBeLessThanOrEqual(now);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(
      new Date(createdAt).getTime(),
    );
  });

  it("is the diagnostic (categories) format, not the legacy fallback", () => {
    const { audit } = getSampleAuditData();
    expect(Array.isArray(audit.categories)).toBe(true);
    expect(audit.categories.length).toBeGreaterThan(0);
  });

  it("has a valid overall score and grade", () => {
    const { audit } = getSampleAuditData();
    expect(audit.overallScore).toBeGreaterThanOrEqual(0);
    expect(audit.overallScore).toBeLessThanOrEqual(100);
    expect(GRADES).toContain(audit.overallGrade);
    expect(audit.executiveSummary.length).toBeGreaterThan(0);
  });

  it("exposes the canonical 8 categories, each fully formed", () => {
    const { audit } = getSampleAuditData();
    expect(audit.categories.map((c) => c.slug)).toEqual(CANONICAL_SLUGS);

    for (const cat of audit.categories) {
      expect(cat.name).toBeTruthy();
      expect(cat.summary).toBeTruthy();
      expect(cat.score).toBeGreaterThanOrEqual(0);
      expect(cat.score).toBeLessThanOrEqual(100);
      // The report page maps over exactly these tuple shapes.
      expect(cat.greenFlags).toHaveLength(2);
      expect(cat.redFlags).toHaveLength(3);
      expect(cat.yellowFlag).toBeTruthy();
      expect(cat.actions.length).toBeGreaterThan(0);
      for (const action of cat.actions) {
        expect(action.title).toBeTruthy();
        expect(action.detail).toBeTruthy();
        expect(PRIORITIES).toContain(action.priority);
      }
    }
  });

  it("has a coherent vacancyCost block", () => {
    const { audit } = getSampleAuditData();
    const v = audit.vacancyCost;
    expect(v.vacantUnits).toBeGreaterThanOrEqual(0);
    expect(v.monthlyLoss).toBeGreaterThanOrEqual(0);
    expect(v.annualLoss).toBeGreaterThanOrEqual(0);
    expect(v.avgUnitRate).toBeGreaterThan(0);
  });

  it("populates the rich sections the report renders conditionally", () => {
    const { audit } = getSampleAuditData();

    expect(audit.industryBenchmarks.length).toBeGreaterThan(0);
    for (const b of audit.industryBenchmarks) {
      expect(b.metric).toBeTruthy();
      expect(b.facilityValue).toBeTruthy();
    }

    const ro = audit.revenueOptimization;
    expect(ro.potentialMonthlyRevenue).toBeGreaterThan(0);
    expect(ro.topOpportunities.length).toBeGreaterThan(0);

    const ci = audit.costOfInaction;
    expect(ci.monthlyBleed).toBeGreaterThan(0);
    expect(ci.urgencyStatement).toBeTruthy();

    const p = audit.ninetyDayProjection;
    expect(p.ifYouAct.keyWins).toHaveLength(3);
    expect(p.ifYouDont.consequences).toHaveLength(3);
  });

  it("includes the conversion funnel (salvaged from diagnostic-analyze)", () => {
    const cf = getSampleAuditData().audit.conversionFunnel;
    expect(cf).toBeDefined();
    expect(cf!.stages).toHaveLength(5);
    for (const stage of cf!.stages) {
      expect(stage.name).toBeTruthy();
      expect(FUNNEL_STATUSES).toContain(stage.status);
      expect(stage.evidence).toBeTruthy();
      expect(stage.leakPercentage).toBeGreaterThanOrEqual(0);
      expect(stage.leakPercentage).toBeLessThanOrEqual(100);
    }
    expect(cf!.biggestLeak).toBeTruthy();
    expect(cf!.narrative).toBeTruthy();
  });

  it("includes the operator alignment block (salvaged from diagnostic-analyze)", () => {
    const oa = getSampleAuditData().audit.operatorAlignment;
    expect(oa).toBeDefined();
    expect(ALIGNMENT_ACCURACY).toContain(oa!.accuracy);
    expect(oa!.operatorSaid).toBeTruthy();
    expect(oa!.auditFound).toBeTruthy();
    expect(oa!.note).toBeTruthy();
  });

  it("returns a structurally stable result across calls", () => {
    const a = getSampleAuditData();
    const b = getSampleAuditData();
    expect(a.audit.categories.length).toBe(b.audit.categories.length);
    expect(a.audit.overallScore).toBe(b.audit.overallScore);
    expect(a.facilityName).toBe(b.facilityName);
  });
});
