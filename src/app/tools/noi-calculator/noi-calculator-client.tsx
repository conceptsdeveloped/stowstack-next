"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowRight, Download, Printer, RotateCcw, Info } from "lucide-react";
import { CAL_BOOKING_URL } from "@/lib/booking";
import ToolHeader, { ToolCta } from "@/components/tools/tool-header";
import RelatedTools from "@/components/tools/related-tools";
import {
  MoneyField,
  PercentField,
  PlainNumber,
  TextField,
  SectionCard,
  ResultRow,
  MiniStat,
  Faq,
  usd0,
  usd2,
  pct,
} from "@/components/tools/fields";
import {
  OTHER_INCOME_FIELDS,
  EXPENSE_FIELDS,
  NOI_DEFAULTS,
  deriveNoi,
  buildNoiCsvRows,
  rowsToCsv,
  noiCsvFileName,
  type NoiState,
} from "@/lib/tools/noi";

/* ──────────────────────────────────────────────────────────────────────────
   Self-storage NOI calculator

   NOI = Effective Gross Income (EGI) − Operating Expenses (OpEx)

   Excluded from NOI on purpose (lenders/buyers underwrite on it, so it stays
   "clean"): debt service / mortgage, depreciation & amortization, capital
   expenditures, income taxes, owner distributions.

   All values are stored internally as ANNUAL dollars. The basis toggle only
   changes how numbers are displayed/entered; storage stays annual so the math
   is consistent regardless of how the operator likes to think.
   ────────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "storageads_noi_calculator_v1";

type Basis = "annual" | "monthly";


export default function NoiCalculatorClient() {
  const [s, setS] = useState<NoiState>(NOI_DEFAULTS);
  const [basis, setBasis] = useState<Basis>("annual");
  const [loaded, setLoaded] = useState(false);

  // Load persisted state once on mount. Must run in an effect (not a lazy
  // initializer) so server and first client render both start from NOI_DEFAULTS
  // and hydration matches; localStorage is then read client-side only.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setS({ ...NOI_DEFAULTS, ...parsed.state });
          if (parsed.basis === "monthly" || parsed.basis === "annual")
            setBasis(parsed.basis);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: s, basis }));
    } catch {
      /* ignore quota errors */
    }
  }, [s, basis, loaded]);

  const d = useMemo(() => deriveNoi(s), [s]);

  const divisor = basis === "monthly" ? 12 : 1;
  const disp = useCallback((annual: number) => annual / divisor, [divisor]);
  const setMoney = useCallback(
    (key: keyof NoiState) => (displayVal: number) =>
      setS((prev) => ({ ...prev, [key]: displayVal * divisor })),
    [divisor],
  );
  const setNum = useCallback(
    (key: keyof NoiState) => (n: number) =>
      setS((prev) => ({ ...prev, [key]: n })),
    [],
  );

  const reset = useCallback(() => {
    setS(NOI_DEFAULTS);
    setBasis("annual");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const downloadCsv = useCallback(() => {
    const csv = rowsToCsv(buildNoiCsvRows(s, d));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = noiCsvFileName(s.facilityName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [d, s]);

  const basisLabel = basis === "monthly" ? "/mo" : "/yr";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-light)" }}>
      <ToolHeader backHref="/tools" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-2xl mb-8">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-mid-gray)" }}
          >
            Free operator tool
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold mt-2 mb-3"
            style={{ color: "var(--color-dark)", letterSpacing: "-0.03em" }}
          >
            Self-Storage NOI Calculator
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-body-text)" }}
          >
            Tally the income and the storage-specific operating expenses and
            triangulate your net operating income in a few minutes. Answer the
            fields you know, skip the ones you don&apos;t. Nothing leaves your
            browser. We&apos;ll show NOI, your expense ratio, per-unit economics,
            and what it implies your facility is worth.
          </p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-8 print:hidden">
          <div
            role="group"
            aria-label="Display basis"
            className="inline-flex rounded-lg p-1"
            style={{ background: "var(--color-light-gray)" }}
          >
            {(["annual", "monthly"] as Basis[]).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={basis === b}
                onClick={() => setBasis(b)}
                className="px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize"
                style={{
                  background: basis === b ? "var(--color-light)" : "transparent",
                  color:
                    basis === b ? "var(--color-dark)" : "var(--color-mid-gray)",
                  boxShadow:
                    basis === b ? "0 1px 2px rgba(20,20,19,0.08)" : "none",
                }}
              >
                {b === "annual" ? "Annual" : "Monthly"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ToolbarButton onClick={downloadCsv} icon={<Download className="h-4 w-4" />}>
              CSV
            </ToolbarButton>
            <ToolbarButton
              onClick={() => window.print()}
              icon={<Printer className="h-4 w-4" />}
            >
              Print
            </ToolbarButton>
            <ToolbarButton onClick={reset} icon={<RotateCcw className="h-4 w-4" />}>
              Reset
            </ToolbarButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
          {/* Inputs */}
          <div className="flex flex-col gap-6">
            <SectionCard
              step="Step 1"
              title="Facility basics"
              subtitle="Optional, but unlocks per-unit and per-square-foot economics in your results."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TextField
                  label="Facility name"
                  value={s.facilityName}
                  onChange={(v) => setS((p) => ({ ...p, facilityName: v }))}
                />
                <PlainNumber
                  label="Total units"
                  value={s.totalUnits}
                  onChange={setNum("totalUnits")}
                />
                <PlainNumber
                  label="Rentable sq ft"
                  value={s.rentableSqft}
                  onChange={setNum("rentableSqft")}
                />
              </div>
            </SectionCard>

            <SectionCard
              step="Step 2"
              title="Income"
              subtitle={`Enter figures in ${basis === "monthly" ? "monthly" : "annual"} dollars. Gross potential rent is what you'd collect at 100% occupancy and street rates.`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                <div className="sm:col-span-2">
                  <MoneyField
                    label={`Gross potential rent (${basisLabel})`}
                    help="All units full, at street rate. Use a quick estimate if you don't have the exact figure."
                    value={disp(s.gpr)}
                    onChange={setMoney("gpr")}
                  />
                  <GprEstimator
                    basis={basis}
                    onApply={(annual) => setS((p) => ({ ...p, gpr: annual }))}
                  />
                </div>
                <PercentField
                  label="Vacancy & credit loss"
                  help="Physical vacancy + concessions + bad debt, as a % of gross potential rent."
                  value={s.vacancyPct}
                  onChange={setNum("vacancyPct")}
                  derivedDollars={d.vacancyLoss / divisor}
                />
                <div className="hidden sm:block" />
                {OTHER_INCOME_FIELDS.map((f) => (
                  <MoneyField
                    key={f.key}
                    label={`${f.label} (${basisLabel})`}
                    help={f.help}
                    value={disp(s[f.key as keyof NoiState] as number)}
                    onChange={setMoney(f.key as keyof NoiState)}
                  />
                ))}
              </div>

              <Subtotal
                label="Effective gross income (EGI)"
                value={usd0(d.egi / divisor)}
                basisLabel={basisLabel}
              />
            </SectionCard>

            <SectionCard
              step="Step 3"
              title="Operating expenses"
              subtitle="Storage-specific operating costs only. Leave out your mortgage, capital improvements, depreciation, and income taxes — those sit below NOI."
            >
              <div className="mb-5">
                <PercentField
                  label="Property management fee"
                  help="If a third party manages the facility (typically 5–6% of collected income). Set to 0 if you self-manage."
                  value={s.managementPct}
                  onChange={setNum("managementPct")}
                  derivedDollars={d.managementFee / divisor}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                {EXPENSE_FIELDS.map((f) => (
                  <MoneyField
                    key={f.key}
                    label={`${f.label} (${basisLabel})`}
                    help={f.help}
                    value={disp(s[f.key as keyof NoiState] as number)}
                    onChange={setMoney(f.key as keyof NoiState)}
                  />
                ))}
              </div>

              <Subtotal
                label="Total operating expenses"
                value={usd0(d.opexTotal / divisor)}
                basisLabel={basisLabel}
              />
            </SectionCard>

            <SectionCard
              step="Step 4"
              title="Valuation (optional)"
              subtitle="Cap rates compress NOI into an asset value. Enter the cap rate buyers are using in your market to see what your NOI is worth."
            >
              <div className="max-w-xs">
                <PercentField
                  label="Market cap rate"
                  help="Self-storage cap rates commonly run ~5.5–7.5% depending on market and asset quality."
                  value={s.capRatePct}
                  onChange={setNum("capRatePct")}
                />
              </div>
            </SectionCard>
          </div>

          {/* Results */}
          <div className="lg:sticky lg:top-20">
            <div
              className="rounded-2xl p-6 sm:p-7"
              style={{ background: "var(--color-dark)", color: "var(--color-light)" }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-mid-gray)" }}
              >
                Your NOI
              </span>
              <div className="mt-2 mb-1">
                <span
                  className="text-4xl font-bold tabular-nums"
                  style={{
                    color: d.noi < 0 ? "var(--color-red)" : "var(--color-light)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {usd0(d.noi / divisor)}
                </span>
                <span
                  className="text-base font-medium ml-1.5"
                  style={{ color: "var(--color-mid-gray)" }}
                >
                  {basisLabel}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-mid-gray)" }}>
                {basis === "monthly"
                  ? `${usd0(d.noi)} per year`
                  : `${usd0(d.noiMonthly)} per month`}
              </p>

              <div
                className="grid grid-cols-2 gap-px mt-6 rounded-xl overflow-hidden"
                style={{ background: "rgba(250,249,245,0.12)" }}
              >
                <MiniStat label="NOI margin" value={d.egi > 0 ? pct(d.noiMargin) : "—"} />
                <MiniStat
                  label="Expense ratio"
                  value={d.egi > 0 ? pct(d.expenseRatio) : "—"}
                />
                <MiniStat
                  label="NOI / unit"
                  value={s.totalUnits > 0 ? `${usd0(d.noiPerUnit)}/yr` : "add units"}
                />
                <MiniStat
                  label="NOI / sq ft"
                  value={
                    s.rentableSqft > 0 ? `${usd2(d.noiPerSqft)}/yr` : "add sq ft"
                  }
                />
              </div>

              <div
                className="mt-5 pt-5"
                style={{ borderTop: "1px solid rgba(250,249,245,0.12)" }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm" style={{ color: "var(--color-mid-gray)" }}>
                    Implied value @ {pct(s.capRatePct)} cap
                  </span>
                  <span className="text-xl font-bold tabular-nums">
                    {s.capRatePct > 0 ? usd0(d.impliedValue) : "—"}
                  </span>
                </div>
              </div>

              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--color-light)", color: "var(--color-dark)" }}
              >
                Grow the NOI line
                <ArrowRight className="h-4 w-4" />
              </a>
              <p
                className="text-xs mt-3 leading-snug"
                style={{ color: "var(--color-mid-gray)" }}
              >
                Higher occupancy and street rates flow straight to NOI. That&apos;s
                the line StorageAds is built to move.
              </p>
            </div>

            {/* P&L breakdown */}
            <div
              className="rounded-2xl p-6 mt-6"
              style={{
                background: "var(--color-light)",
                border: "1px solid var(--color-light-gray)",
              }}
            >
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: "var(--color-dark)" }}
              >
                The math ({basis})
              </h3>
              <ResultRow label="Gross potential rent" value={usd0(d.gpr / divisor)} />
              <ResultRow
                label={`Less vacancy & credit loss (${pct(s.vacancyPct)})`}
                value={`(${usd0(d.vacancyLoss / divisor)})`}
                muted
              />
              <ResultRow label="Other income" value={usd0(d.otherIncomeTotal / divisor)} />
              <Divider />
              <ResultRow
                label="Effective gross income"
                value={usd0(d.egi / divisor)}
                strong
              />
              <ResultRow
                label="Less operating expenses"
                value={`(${usd0(d.opexTotal / divisor)})`}
                muted
              />
              <Divider />
              <ResultRow
                label="Net operating income"
                value={usd0(d.noi / divisor)}
                strong
                negative={d.noi < 0}
              />
            </div>

            {/* excluded note */}
            <div
              className="rounded-2xl p-5 mt-6 flex gap-3"
              style={{ background: "var(--color-light-gray)" }}
            >
              <Info
                className="h-4 w-4 mt-0.5 flex-shrink-0"
                style={{ color: "var(--color-mid-gray)" }}
              />
              <div>
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: "var(--color-dark)" }}
                >
                  Not counted in NOI (on purpose)
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--color-body-text)" }}
                >
                  Mortgage / debt service, capital improvements, depreciation,
                  amortization, and income taxes all sit below the NOI line.
                  Leaving them out is what makes NOI comparable across facilities
                  and the number lenders and buyers underwrite.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Methodology / FAQ */}
        <div className="max-w-3xl mt-16 print:hidden">
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}
          >
            How NOI works for storage
          </h2>
          <div className="flex flex-col gap-6">
            <Faq q="What exactly is NOI?">
              Net operating income is your effective gross income minus your
              operating expenses. It is the cash the property throws off before
              financing and taxes. Formula: EGI − operating expenses = NOI.
            </Faq>
            <Faq q="What is effective gross income (EGI)?">
              Gross potential rent (every unit full at street rate) minus vacancy
              and credit loss, plus other income like tenant insurance
              commissions, late fees, admin fees, retail, and truck rental. It is
              the income you actually collect.
            </Faq>
            <Faq q="Which expenses belong in NOI?">
              Only operating costs of running the facility: payroll, property
              taxes, insurance, utilities, repairs, marketing, management fees,
              office/software, processing fees, security, grounds, and
              professional fees. Keep them storage-specific.
            </Faq>
            <Faq q="What should I leave out?">
              Your mortgage and interest, capital expenditures (new roof, paving,
              door replacement), depreciation, amortization, and income taxes.
              Those sit below NOI. Folding them in understates your NOI and
              distorts your valuation.
            </Faq>
            <Faq q="How does NOI drive my facility's value?">
              Buyers value storage on a cap rate: value = NOI ÷ cap rate. At a
              6.5% cap, every extra $10,000 of annual NOI adds roughly $154,000 of
              value. Filling units and raising rates is the fastest lever, which
              is exactly what marketing should be measured against.
            </Faq>
            <Faq q="What's a healthy expense ratio?">
              Self-storage operating expense ratios commonly land in the 35–45%
              range of EGI, varying with management model, climate control, taxes,
              and market. Your number is a starting point for a conversation, not
              a verdict.
            </Faq>
          </div>

          <div className="mt-12">
            <ToolCta
              heading="A sign on a chainlink fence is not an acquisition strategy"
              body="NOI grows when units fill and rates hold. StorageAds runs the ads, builds the landing pages, and proves which campaigns moved the line. Built by an operator, tested on our own facilities first."
            />
          </div>
        </div>

        <RelatedTools currentHref="/tools/noi-calculator" />

        <p
          className="text-xs mt-12 max-w-2xl leading-relaxed"
          style={{ color: "var(--color-mid-gray)" }}
        >
          This calculator is an estimating tool for self-storage operators. It
          does not constitute financial, accounting, tax, or investment advice.
          Figures are only as accurate as the inputs you provide. Confirm any
          number used for a transaction, loan, or valuation with your accountant.
        </p>
      </main>
    </div>
  );
}

function Subtotal({
  label,
  value,
  basisLabel,
}: {
  label: string;
  value: string;
  basisLabel: string;
}) {
  return (
    <div
      className="mt-6 pt-5 flex items-baseline justify-between"
      style={{ borderTop: "1px solid var(--color-light-gray)" }}
    >
      <span className="text-sm font-semibold" style={{ color: "var(--color-dark)" }}>
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums" style={{ color: "var(--color-dark)" }}>
        {value}
        <span className="text-sm font-medium ml-1" style={{ color: "var(--color-mid-gray)" }}>
          {basisLabel}
        </span>
      </span>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={{ border: "1px solid var(--color-light-gray)", color: "var(--color-body-text)" }}
    >
      {icon}
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="my-1.5" style={{ borderTop: "1px solid var(--color-light-gray)" }} />
  );
}

/* GPR quick estimator — specific to this calculator. */
function GprEstimator({
  basis,
  onApply,
}: {
  basis: Basis;
  onApply: (annual: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState("");
  const [rate, setRate] = useState("");
  const u = parseFloat(units) || 0;
  const r = parseFloat(rate) || 0;
  const annual = u * r * 12;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium underline-offset-2 hover:underline"
        style={{ color: "var(--color-mid-gray)" }}
      >
        {open ? "Hide quick estimate" : "Don't know it? Quick estimate →"}
      </button>
      {open && (
        <div
          className="mt-3 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
          style={{ background: "var(--color-light-gray)" }}
        >
          <label className="block">
            <span
              className="text-xs font-medium block mb-1"
              style={{ color: "var(--color-body-text)" }}
            >
              Total units
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={units}
              placeholder="0"
              onChange={(e) => setUnits(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full rounded-md py-2 px-2.5 text-sm tabular-nums outline-none"
              style={{
                border: "1px solid var(--color-mid-gray)",
                background: "var(--color-light)",
                color: "var(--color-dark)",
              }}
            />
          </label>
          <label className="block">
            <span
              className="text-xs font-medium block mb-1"
              style={{ color: "var(--color-body-text)" }}
            >
              Avg rate / mo
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={rate}
              placeholder="0"
              onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full rounded-md py-2 px-2.5 text-sm tabular-nums outline-none"
              style={{
                border: "1px solid var(--color-mid-gray)",
                background: "var(--color-light)",
                color: "var(--color-dark)",
              }}
            />
          </label>
          <button
            type="button"
            disabled={annual <= 0}
            onClick={() => {
              onApply(annual);
              setOpen(false);
            }}
            className="rounded-md py-2 px-3 text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--color-dark)", color: "var(--color-light)" }}
          >
            Use {annual > 0 ? usd0(basis === "monthly" ? annual / 12 : annual) : "—"}
          </button>
        </div>
      )}
    </div>
  );
}
