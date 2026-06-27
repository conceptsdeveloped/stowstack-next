/**
 * DSCR / loan-sizing for self-storage — pure logic, no React.
 *
 * Lenders underwrite storage on NOI: they size the loan so the debt service
 * coverage ratio (DSCR = NOI ÷ annual debt service) clears a floor, typically
 * 1.20–1.35x. This tool runs both directions:
 *
 *   mode "size":  given NOI + a target DSCR + rate + amortization, what's the
 *                 largest loan that still clears the DSCR floor?
 *   mode "check": given NOI + a loan amount + rate + amortization, what DSCR,
 *                 debt yield, and post-debt cash flow does it produce?
 *
 * Debt service is a fully-amortizing fixed-rate mortgage payment. Everything is
 * annual NOI; rate is a nominal annual percentage compounded monthly.
 */

import { clampPct, nonNeg, usd0, usd2, pct } from "./format";
import type { CsvRow } from "./csv";

export type DscrMode = "size" | "check";

export interface DscrState {
  mode: DscrMode;
  noi: number; // annual
  interestRatePct: number; // annual nominal
  amortYears: number;
  targetDscr: number; // used in "size" mode
  loanAmount: number; // used in "check" mode
  purchasePrice: number; // optional, enables LTV
}

export const DSCR_DEFAULTS: DscrState = {
  mode: "size",
  noi: 0,
  interestRatePct: 6.5,
  amortYears: 25,
  targetDscr: 1.25,
  loanAmount: 0,
  purchasePrice: 0,
};

export interface DscrResult {
  months: number;
  monthlyRate: number;
  monthlyPayment: number;
  annualDebtService: number;
  dscr: number;
  loanAmount: number;
  debtYield: number; // NOI / loan, %
  ltv: number; // loan / price, %
  cashFlowAfterDebt: number; // annual NOI − annual debt service
}

/** Fully-amortizing monthly payment for a fixed-rate loan. */
export function monthlyPayment(
  principal: number,
  annualRatePct: number,
  years: number,
): number {
  const p = nonNeg(principal);
  const n = Math.round(nonNeg(years) * 12);
  if (n <= 0) return 0;
  const r = nonNeg(annualRatePct) / 100 / 12;
  if (r === 0) return p / n;
  const factor = Math.pow(1 + r, n);
  return (p * (r * factor)) / (factor - 1);
}

/** Inverse of monthlyPayment: the loan a given payment can support. */
export function loanFromPayment(
  payment: number,
  annualRatePct: number,
  years: number,
): number {
  const m = nonNeg(payment);
  const n = Math.round(nonNeg(years) * 12);
  if (n <= 0) return 0;
  const r = nonNeg(annualRatePct) / 100 / 12;
  if (r === 0) return m * n;
  const factor = Math.pow(1 + r, n);
  return (m * (factor - 1)) / (r * factor);
}

export function deriveDscr(s: DscrState): DscrResult {
  const noi = nonNeg(s.noi);
  const rate = nonNeg(s.interestRatePct);
  const years = nonNeg(s.amortYears);
  const price = nonNeg(s.purchasePrice);
  const months = Math.round(years * 12);
  const monthlyRate = rate / 100 / 12;

  let loanAmount: number;
  let annualDebtService: number;
  let monthly: number;
  let dscr: number;

  if (s.mode === "size") {
    const targetDscr = nonNeg(s.targetDscr);
    annualDebtService = targetDscr > 0 ? noi / targetDscr : 0;
    monthly = annualDebtService / 12;
    loanAmount = loanFromPayment(monthly, rate, years);
    dscr = targetDscr;
  } else {
    loanAmount = nonNeg(s.loanAmount);
    monthly = monthlyPayment(loanAmount, rate, years);
    annualDebtService = monthly * 12;
    dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  }

  const debtYield = loanAmount > 0 ? (noi / loanAmount) * 100 : 0;
  const ltv = price > 0 ? (loanAmount / price) * 100 : 0;
  const cashFlowAfterDebt = noi - annualDebtService;

  return {
    months,
    monthlyRate,
    monthlyPayment: monthly,
    annualDebtService,
    dscr,
    loanAmount,
    debtYield,
    ltv,
    cashFlowAfterDebt,
  };
}

/** Rows for the CSV export. Pure (no DOM) so it can be unit-tested. */
export function buildDscrCsvRows(s: DscrState, d: DscrResult): CsvRow[] {
  return [
    ["Metric", "Value"],
    ["Mode", s.mode === "size" ? "Size a loan" : "Check a loan"],
    ["Annual NOI", usd0(s.noi)],
    ["Interest rate", pct(clampPct(s.interestRatePct))],
    ["Amortization (years)", String(Math.round(nonNeg(s.amortYears)))],
    [
      "Target DSCR",
      s.mode === "size" ? `${nonNeg(s.targetDscr).toFixed(2)}x` : "n/a",
    ],
    ["Maximum / entered loan", usd0(d.loanAmount)],
    ["Monthly payment", usd2(d.monthlyPayment)],
    ["Annual debt service", usd0(d.annualDebtService)],
    ["DSCR", d.dscr > 0 ? `${d.dscr.toFixed(2)}x` : "n/a"],
    ["Debt yield", d.loanAmount > 0 ? pct(d.debtYield) : "n/a"],
    ["Loan-to-value", s.purchasePrice > 0 ? pct(d.ltv) : "n/a"],
    ["Cash flow after debt service", usd0(d.cashFlowAfterDebt)],
  ];
}
