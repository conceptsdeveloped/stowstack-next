"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Printer,
  RotateCcw,
  Info,
} from "lucide-react";
import { CAL_BOOKING_URL } from "@/lib/booking";

/* ──────────────────────────────────────────────────────────────────────────
   Self-storage NOI calculator

   NOI = Effective Gross Income (EGI) − Operating Expenses (OpEx)

   Excluded from NOI on purpose (lenders/buyers underwrite on it, so it stays
   "clean"): debt service / mortgage, depreciation & amortization, capital
   expenditures, income taxes, owner distributions. We surface that note so
   operators don't accidentally bury their NOI by subtracting their loan.

   All values are stored internally as ANNUAL dollars. The basis toggle only
   changes how numbers are displayed/entered; storage stays annual so the
   math is consistent regardless of how the operator likes to think.
   ────────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "storageads_noi_calculator_v1";

type Basis = "annual" | "monthly";

interface FieldDef {
  key: string;
  label: string;
  help?: string;
}

/* Income line items (annual $, stored canonical) ------------------------- */
const OTHER_INCOME_FIELDS: FieldDef[] = [
  {
    key: "tenantInsurance",
    label: "Tenant insurance / protection",
    help: "Your commission share on tenant protection plans or stored-goods insurance.",
  },
  {
    key: "lateFees",
    label: "Late fees & lien fees",
    help: "Delinquency fees, lien/auction prep fees you actually collect.",
  },
  {
    key: "adminFees",
    label: "Admin & move-in fees",
    help: "One-time setup / administrative fees charged at move-in.",
  },
  {
    key: "merchandise",
    label: "Retail & merchandise",
    help: "Locks, boxes, packing supplies sold at the counter (net of cost, or gross — track COGS below).",
  },
  {
    key: "truckRental",
    label: "Truck rental commissions",
    help: "U-Haul / Penske / box-truck referral or rental commissions.",
  },
  {
    key: "otherIncome",
    label: "Other income",
    help: "Cell tower / billboard leases, parking, RV/boat, anything else recurring.",
  },
];

/* Operating expense line items (annual $) -------------------------------- */
const EXPENSE_FIELDS: FieldDef[] = [
  {
    key: "payroll",
    label: "On-site payroll & wages",
    help: "Manager + relief/part-time wages. Exclude your own owner draw if you don't pay yourself a market wage.",
  },
  {
    key: "payrollTaxesBenefits",
    label: "Payroll taxes & benefits",
    help: "Employer FICA, unemployment, workers' comp, health, bonuses.",
  },
  {
    key: "propertyTax",
    label: "Property taxes",
    help: "Annual real estate taxes on the facility parcel(s).",
  },
  {
    key: "insurance",
    label: "Property & liability insurance",
    help: "Building, general liability, umbrella. Not tenant insurance.",
  },
  {
    key: "utilities",
    label: "Utilities",
    help: "Electric, water, sewer, gas, trash — common areas, lights, gate, climate control.",
  },
  {
    key: "repairs",
    label: "Repairs & maintenance",
    help: "Doors, springs, gate motor, asphalt patching, HVAC service, general upkeep (not capex).",
  },
  {
    key: "marketing",
    label: "Marketing & advertising",
    help: "Ad spend, listing sites, signage, website, lead gen.",
  },
  {
    key: "adminOffice",
    label: "Office & administrative",
    help: "Management software / PMS, phone, internet, office supplies, postage.",
  },
  {
    key: "merchantFees",
    label: "Credit card & merchant fees",
    help: "Processing fees on rent and retail collected by card/ACH.",
  },
  {
    key: "security",
    label: "Security & gate monitoring",
    help: "Camera / alarm monitoring, gate software subscriptions, access control.",
  },
  {
    key: "grounds",
    label: "Grounds: landscaping, snow, pest",
    help: "Landscaping, snow removal, pest control, lot sweeping.",
  },
  {
    key: "professionalFees",
    label: "Professional fees",
    help: "Legal, accounting, tax prep, bookkeeping.",
  },
  {
    key: "merchandiseCogs",
    label: "Merchandise cost of goods",
    help: "What you pay for the locks/boxes/supplies you resell.",
  },
  {
    key: "licensesMisc",
    label: "Licenses, permits & misc",
    help: "Business licenses, permits, dues, bank fees, anything uncategorized.",
  },
];

interface CalcState {
  // facility meta
  facilityName: string;
  totalUnits: number;
  rentableSqft: number;
  // income (annual $)
  gpr: number;
  vacancyPct: number;
  tenantInsurance: number;
  lateFees: number;
  adminFees: number;
  merchandise: number;
  truckRental: number;
  otherIncome: number;
  // expenses (annual $)
  managementPct: number;
  payroll: number;
  payrollTaxesBenefits: number;
  propertyTax: number;
  insurance: number;
  utilities: number;
  repairs: number;
  marketing: number;
  adminOffice: number;
  merchantFees: number;
  security: number;
  grounds: number;
  professionalFees: number;
  merchandiseCogs: number;
  licensesMisc: number;
  // valuation
  capRatePct: number;
}

const DEFAULTS: CalcState = {
  facilityName: "",
  totalUnits: 0,
  rentableSqft: 0,
  gpr: 0,
  vacancyPct: 10,
  tenantInsurance: 0,
  lateFees: 0,
  adminFees: 0,
  merchandise: 0,
  truckRental: 0,
  otherIncome: 0,
  managementPct: 0,
  payroll: 0,
  payrollTaxesBenefits: 0,
  propertyTax: 0,
  insurance: 0,
  utilities: 0,
  repairs: 0,
  marketing: 0,
  adminOffice: 0,
  merchantFees: 0,
  security: 0,
  grounds: 0,
  professionalFees: 0,
  merchandiseCogs: 0,
  licensesMisc: 0,
  capRatePct: 6.5,
};

/* ── formatting helpers ─────────────────────────────────────────────────── */
const usd0 = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const usd2 = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

/* ── derived totals ─────────────────────────────────────────────────────── */
interface Derived {
  gpr: number;
  vacancyLoss: number;
  rentalIncomeNet: number;
  otherIncomeTotal: number;
  egi: number;
  managementFee: number;
  opexTotal: number;
  noi: number;
  noiMonthly: number;
  noiMargin: number;
  expenseRatio: number;
  noiPerUnit: number;
  noiPerSqft: number;
  impliedValue: number;
  expenseLines: { label: string; amount: number }[];
}

function derive(s: CalcState): Derived {
  const gpr = Math.max(0, s.gpr);
  const vacancyLoss = gpr * (clampPct(s.vacancyPct) / 100);
  const rentalIncomeNet = gpr - vacancyLoss;
  const otherIncomeTotal =
    s.tenantInsurance +
    s.lateFees +
    s.adminFees +
    s.merchandise +
    s.truckRental +
    s.otherIncome;
  const egi = rentalIncomeNet + otherIncomeTotal;

  const managementFee = egi * (clampPct(s.managementPct) / 100);

  const lineExpenses = EXPENSE_FIELDS.reduce(
    (sum, f) => sum + (s[f.key as keyof CalcState] as number),
    0,
  );
  const opexTotal = managementFee + lineExpenses;

  const noi = egi - opexTotal;
  const noiMargin = egi > 0 ? (noi / egi) * 100 : 0;
  const expenseRatio = egi > 0 ? (opexTotal / egi) * 100 : 0;
  const noiPerUnit = s.totalUnits > 0 ? noi / s.totalUnits : 0;
  const noiPerSqft = s.rentableSqft > 0 ? noi / s.rentableSqft : 0;
  const cap = clampPct(s.capRatePct);
  const impliedValue = cap > 0 ? noi / (cap / 100) : 0;

  const expenseLines = [
    { label: "Property management fee", amount: managementFee },
    ...EXPENSE_FIELDS.map((f) => ({
      label: f.label,
      amount: s[f.key as keyof CalcState] as number,
    })),
  ].filter((l) => l.amount > 0);

  return {
    gpr,
    vacancyLoss,
    rentalIncomeNet,
    otherIncomeTotal,
    egi,
    managementFee,
    opexTotal,
    noi,
    noiMonthly: noi / 12,
    noiMargin,
    expenseRatio,
    noiPerUnit,
    noiPerSqft,
    impliedValue,
    expenseLines,
  };
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/* ── number field with its own text buffer (so basis toggle + reset resync,
      but live typing isn't clobbered) ──────────────────────────────────── */
function MoneyField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: number; // already in display basis
  onChange: (n: number) => void; // receives display-basis number
}) {
  const [text, setText] = useState(() => (value ? String(round2(value)) : ""));
  // Adjust the text buffer during render when the external value changes for a
  // reason other than this field's own edit (basis toggle, reset, load). React
  // supports setState during render; this avoids a setState-in-effect cascade.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    const parsed = text === "" || text === "." ? 0 : parseFloat(text) || 0;
    if (Math.abs(parsed - value) > 0.005) {
      setText(value ? String(round2(value)) : "");
    }
  }

  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-dark)" }}
        >
          {label}
        </span>
      </div>
      <div
        className="flex items-center rounded-lg overflow-hidden focus-within:ring-2"
        style={{
          border: "1px solid var(--color-light-gray)",
          background: "var(--color-light)",
          // ring color set via CSS var fallback
          ["--tw-ring-color" as string]: "var(--color-dark)",
        }}
      >
        <span
          className="pl-3 pr-1 text-sm select-none"
          style={{ color: "var(--color-mid-gray)" }}
        >
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder="0"
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            setText(raw);
            const n = raw === "" || raw === "." ? 0 : parseFloat(raw);
            const safe = Number.isFinite(n) ? n : 0;
            setSyncedValue(safe);
            onChange(safe);
          }}
          className="w-full bg-transparent py-2.5 pr-3 text-sm tabular-nums outline-none"
          style={{ color: "var(--color-dark)" }}
        />
      </div>
      {help && (
        <p
          className="text-xs mt-1.5 leading-snug"
          style={{ color: "var(--color-mid-gray)" }}
        >
          {help}
        </p>
      )}
    </label>
  );
}

function PercentField({
  label,
  help,
  value,
  onChange,
  derivedDollars,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (n: number) => void;
  derivedDollars?: number;
}) {
  const [text, setText] = useState(() => (value ? String(value) : ""));
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    const parsed = text === "" || text === "." ? 0 : parseFloat(text) || 0;
    if (Math.abs(parsed - value) > 0.005) {
      setText(value ? String(value) : "");
    }
  }

  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-dark)" }}
        >
          {label}
        </span>
        {derivedDollars != null && derivedDollars > 0 && (
          <span
            className="text-xs tabular-nums"
            style={{ color: "var(--color-mid-gray)" }}
          >
            ≈ {usd0(derivedDollars)}/yr
          </span>
        )}
      </div>
      <div
        className="flex items-center rounded-lg overflow-hidden focus-within:ring-2"
        style={{
          border: "1px solid var(--color-light-gray)",
          background: "var(--color-light)",
          ["--tw-ring-color" as string]: "var(--color-dark)",
        }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder="0"
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            setText(raw);
            const n = raw === "" || raw === "." ? 0 : parseFloat(raw);
            const safe = Number.isFinite(n) ? n : 0;
            setSyncedValue(safe);
            onChange(safe);
          }}
          className="w-full bg-transparent py-2.5 pl-3 text-sm tabular-nums outline-none"
          style={{ color: "var(--color-dark)" }}
        />
        <span
          className="pr-3 pl-1 text-sm select-none"
          style={{ color: "var(--color-mid-gray)" }}
        >
          %
        </span>
      </div>
      {help && (
        <p
          className="text-xs mt-1.5 leading-snug"
          style={{ color: "var(--color-mid-gray)" }}
        >
          {help}
        </p>
      )}
    </label>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function SectionCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-5 sm:p-7"
      style={{
        background: "var(--color-light)",
        border: "1px solid var(--color-light-gray)",
      }}
    >
      <div className="mb-5">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-mid-gray)" }}
        >
          {step}
        </span>
        <h2
          className="text-xl font-semibold mt-1"
          style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-sm mt-1 leading-relaxed"
            style={{ color: "var(--color-body-text)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function ResultRow({
  label,
  value,
  strong,
  muted,
  negative,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span
        className="text-sm"
        style={{
          color: muted ? "var(--color-mid-gray)" : "var(--color-body-text)",
          fontWeight: strong ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        className="text-sm tabular-nums"
        style={{
          color: negative
            ? "var(--color-red)"
            : strong
              ? "var(--color-dark)"
              : "var(--color-dark)",
          fontWeight: strong ? 700 : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function NoiCalculatorClient() {
  const [s, setS] = useState<CalcState>(DEFAULTS);
  const [basis, setBasis] = useState<Basis>("annual");
  const [loaded, setLoaded] = useState(false);

  // Load persisted state once on mount. Must run in an effect (not a lazy
  // initializer) so server and first client render both start from DEFAULTS
  // and hydration matches; localStorage is then read client-side only.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setS({ ...DEFAULTS, ...parsed.state });
          if (parsed.basis === "monthly" || parsed.basis === "annual")
            setBasis(parsed.basis);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  // persist
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: s, basis }));
    } catch {
      /* ignore quota errors */
    }
  }, [s, basis, loaded]);

  const d = useMemo(() => derive(s), [s]);

  const divisor = basis === "monthly" ? 12 : 1;
  // display a stored annual $ in the current basis
  const disp = useCallback((annual: number) => annual / divisor, [divisor]);
  // setter: a money field reports a display-basis number, store as annual
  const setMoney = useCallback(
    (key: keyof CalcState) => (displayVal: number) =>
      setS((prev) => ({ ...prev, [key]: displayVal * divisor })),
    [divisor],
  );
  const setNum = useCallback(
    (key: keyof CalcState) => (n: number) =>
      setS((prev) => ({ ...prev, [key]: n })),
    [],
  );

  const reset = useCallback(() => {
    setS(DEFAULTS);
    setBasis("annual");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const downloadCsv = useCallback(() => {
    const rows: [string, string, string][] = [
      ["Line item", "Annual", "Monthly"],
      ["Gross potential rent", money(d.gpr), money(d.gpr / 12)],
      [
        `Less vacancy & credit loss (${pct(s.vacancyPct)})`,
        money(-d.vacancyLoss),
        money(-d.vacancyLoss / 12),
      ],
      ["Net rental income", money(d.rentalIncomeNet), money(d.rentalIncomeNet / 12)],
      ["Other income", money(d.otherIncomeTotal), money(d.otherIncomeTotal / 12)],
      ["Effective gross income (EGI)", money(d.egi), money(d.egi / 12)],
      ...d.expenseLines.map(
        (l) =>
          [`  ${l.label}`, money(-l.amount), money(-l.amount / 12)] as [
            string,
            string,
            string,
          ],
      ),
      ["Total operating expenses", money(-d.opexTotal), money(-d.opexTotal / 12)],
      ["NET OPERATING INCOME (NOI)", money(d.noi), money(d.noi / 12)],
      ["NOI margin", pct(d.noiMargin), ""],
      ["Operating expense ratio", pct(d.expenseRatio), ""],
      [
        "NOI per unit",
        s.totalUnits > 0 ? money(d.noiPerUnit) : "n/a",
        "",
      ],
      [
        "NOI per rentable sq ft",
        s.rentableSqft > 0 ? usd2(d.noiPerSqft) : "n/a",
        "",
      ],
      [
        `Implied value @ ${pct(s.capRatePct)} cap`,
        money(d.impliedValue),
        "",
      ],
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = (s.facilityName || "facility")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    a.download = `noi-${name || "storage"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [d, s]);

  const basisLabel = basis === "monthly" ? "/mo" : "/yr";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-light)" }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 border-b print:hidden"
        style={{
          background: "rgba(250,249,245,0.9)",
          backdropFilter: "blur(12px)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/tools"
              aria-label="Back to tools"
              className="p-2 -ml-2 transition-opacity hover:opacity-70"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ArrowLeft size={20} />
            </Link>
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  fontSize: 17,
                  color: "var(--color-dark)",
                }}
              >
                storage<span style={{ color: "var(--brand-gold)" }}>ads</span>
              </span>
            </Link>
          </div>
          <a
            href={CAL_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-dark)",
              color: "var(--color-light)",
            }}
          >
            Book a Call
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* ── Title ── */}
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
            browser. We&apos;ll show NOI, your expense ratio, per-unit
            economics, and what it implies your facility is worth.
          </p>
        </div>

        {/* ── Basis toggle ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-8 print:hidden">
          <div
            className="inline-flex rounded-lg p-1"
            style={{ background: "var(--color-light-gray)" }}
          >
            {(["annual", "monthly"] as Basis[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBasis(b)}
                className="px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize"
                style={{
                  background:
                    basis === b ? "var(--color-light)" : "transparent",
                  color:
                    basis === b
                      ? "var(--color-dark)"
                      : "var(--color-mid-gray)",
                  boxShadow:
                    basis === b ? "0 1px 2px rgba(20,20,19,0.08)" : "none",
                }}
              >
                {b === "annual" ? "Annual" : "Monthly"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={{
                border: "1px solid var(--color-light-gray)",
                color: "var(--color-body-text)",
              }}
            >
              <Download className="h-4 w-4" /> CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={{
                border: "1px solid var(--color-light-gray)",
                color: "var(--color-body-text)",
              }}
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={{
                border: "1px solid var(--color-light-gray)",
                color: "var(--color-body-text)",
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
          {/* ── Inputs column ── */}
          <div className="flex flex-col gap-6">
            {/* Facility basics */}
            <SectionCard
              step="Step 1"
              title="Facility basics"
              subtitle="Optional, but unlocks per-unit and per-square-foot economics in your results."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="block sm:col-span-1">
                  <span
                    className="text-sm font-medium block mb-1.5"
                    style={{ color: "var(--color-dark)" }}
                  >
                    Facility name
                  </span>
                  <input
                    type="text"
                    value={s.facilityName}
                    placeholder="Optional"
                    onChange={(e) =>
                      setS((p) => ({ ...p, facilityName: e.target.value }))
                    }
                    className="w-full rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2"
                    style={{
                      border: "1px solid var(--color-light-gray)",
                      background: "var(--color-light)",
                      color: "var(--color-dark)",
                      ["--tw-ring-color" as string]: "var(--color-dark)",
                    }}
                  />
                </label>
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

            {/* Income */}
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
                    onApply={(annual) =>
                      setS((p) => ({ ...p, gpr: annual }))
                    }
                  />
                </div>
                <PercentField
                  label="Vacancy & credit loss"
                  help="Physical vacancy + concessions + bad debt, as a % of gross potential rent."
                  value={s.vacancyPct}
                  onChange={setNum("vacancyPct")}
                  derivedDollars={d.vacancyLoss}
                />
                <div className="hidden sm:block" />
                {OTHER_INCOME_FIELDS.map((f) => (
                  <MoneyField
                    key={f.key}
                    label={`${f.label} (${basisLabel})`}
                    help={f.help}
                    value={disp(s[f.key as keyof CalcState] as number)}
                    onChange={setMoney(f.key as keyof CalcState)}
                  />
                ))}
              </div>

              <div
                className="mt-6 pt-5 flex items-baseline justify-between"
                style={{ borderTop: "1px solid var(--color-light-gray)" }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-dark)" }}
                >
                  Effective gross income (EGI)
                </span>
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: "var(--color-dark)" }}
                >
                  {money(d.egi / divisor)}
                  <span
                    className="text-sm font-medium ml-1"
                    style={{ color: "var(--color-mid-gray)" }}
                  >
                    {basisLabel}
                  </span>
                </span>
              </div>
            </SectionCard>

            {/* Expenses */}
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
                  derivedDollars={d.managementFee}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                {EXPENSE_FIELDS.map((f) => (
                  <MoneyField
                    key={f.key}
                    label={`${f.label} (${basisLabel})`}
                    help={f.help}
                    value={disp(s[f.key as keyof CalcState] as number)}
                    onChange={setMoney(f.key as keyof CalcState)}
                  />
                ))}
              </div>

              <div
                className="mt-6 pt-5 flex items-baseline justify-between"
                style={{ borderTop: "1px solid var(--color-light-gray)" }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-dark)" }}
                >
                  Total operating expenses
                </span>
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: "var(--color-dark)" }}
                >
                  {money(d.opexTotal / divisor)}
                  <span
                    className="text-sm font-medium ml-1"
                    style={{ color: "var(--color-mid-gray)" }}
                  >
                    {basisLabel}
                  </span>
                </span>
              </div>
            </SectionCard>

            {/* Valuation input */}
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

          {/* ── Results column (sticky on desktop) ── */}
          <div className="lg:sticky lg:top-20">
            <div
              className="rounded-2xl p-6 sm:p-7"
              style={{
                background: "var(--color-dark)",
                color: "var(--color-light)",
              }}
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
                    color:
                      d.noi < 0 ? "var(--color-red)" : "var(--color-light)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {money(d.noi / divisor)}
                </span>
                <span
                  className="text-base font-medium ml-1.5"
                  style={{ color: "var(--color-mid-gray)" }}
                >
                  {basisLabel}
                </span>
              </div>
              <p
                className="text-sm"
                style={{ color: "var(--color-mid-gray)" }}
              >
                {basis === "monthly"
                  ? `${money(d.noi)} per year`
                  : `${money(d.noiMonthly)} per month`}
              </p>

              {/* mini metric grid */}
              <div
                className="grid grid-cols-2 gap-px mt-6 rounded-xl overflow-hidden"
                style={{ background: "rgba(250,249,245,0.12)" }}
              >
                <MiniStat
                  label="NOI margin"
                  value={d.egi > 0 ? pct(d.noiMargin) : "—"}
                />
                <MiniStat
                  label="Expense ratio"
                  value={d.egi > 0 ? pct(d.expenseRatio) : "—"}
                />
                <MiniStat
                  label="NOI / unit"
                  value={
                    s.totalUnits > 0 ? `${usd0(d.noiPerUnit)}/yr` : "add units"
                  }
                />
                <MiniStat
                  label="NOI / sq ft"
                  value={
                    s.rentableSqft > 0
                      ? `${usd2(d.noiPerSqft)}/yr`
                      : "add sq ft"
                  }
                />
              </div>

              {/* implied value */}
              <div
                className="mt-5 pt-5"
                style={{ borderTop: "1px solid rgba(250,249,245,0.12)" }}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className="text-sm"
                    style={{ color: "var(--color-mid-gray)" }}
                  >
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
                style={{
                  background: "var(--color-light)",
                  color: "var(--color-dark)",
                }}
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
              <ResultRow label="Gross potential rent" value={money(d.gpr / divisor)} />
              <ResultRow
                label={`Less vacancy & credit loss (${pct(s.vacancyPct)})`}
                value={`(${money(d.vacancyLoss / divisor)})`}
                muted
              />
              <ResultRow
                label="Other income"
                value={money(d.otherIncomeTotal / divisor)}
              />
              <div
                className="my-1.5"
                style={{ borderTop: "1px solid var(--color-light-gray)" }}
              />
              <ResultRow
                label="Effective gross income"
                value={money(d.egi / divisor)}
                strong
              />
              <ResultRow
                label="Less operating expenses"
                value={`(${money(d.opexTotal / divisor)})`}
                muted
              />
              <div
                className="my-1.5"
                style={{ borderTop: "1px solid var(--color-light-gray)" }}
              />
              <ResultRow
                label="Net operating income"
                value={money(d.noi / divisor)}
                strong
                negative={d.noi < 0}
              />
            </div>

            {/* excluded note */}
            <div
              className="rounded-2xl p-5 mt-6 flex gap-3"
              style={{
                background: "var(--color-light-gray)",
              }}
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

        {/* ── Methodology / FAQ ── */}
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
              Gross potential rent (every unit full at street rate) minus
              vacancy and credit loss, plus other income like tenant insurance
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

          <div
            className="rounded-2xl p-7 mt-12 text-center"
            style={{
              background: "var(--color-dark)",
              color: "var(--color-light)",
            }}
          >
            <h3 className="text-xl font-bold mb-2">
              A sign on a chainlink fence is not an acquisition strategy
            </h3>
            <p
              className="text-sm mb-5 max-w-md mx-auto leading-relaxed"
              style={{ color: "var(--color-mid-gray)" }}
            >
              NOI grows when units fill and rates hold. StorageAds runs the ads,
              builds the landing pages, and proves which campaigns moved the line.
              Built by an operator, tested on our own facilities first.
            </p>
            <a
              href={CAL_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "var(--color-light)",
                color: "var(--color-dark)",
              }}
            >
              Book a Call
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

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

/* ── plain integer field (units, sqft) ──────────────────────────────────── */
function PlainNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(() => (value ? String(value) : ""));
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    const parsed = text === "" ? 0 : parseInt(text, 10) || 0;
    if (parsed !== value) {
      setText(value ? String(value) : "");
    }
  }
  return (
    <label className="block">
      <span
        className="text-sm font-medium block mb-1.5"
        style={{ color: "var(--color-dark)" }}
      >
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          setText(raw);
          const n = raw === "" ? 0 : parseInt(raw, 10);
          const safe = Number.isFinite(n) ? n : 0;
          setSyncedValue(safe);
          onChange(safe);
        }}
        className="w-full rounded-lg py-2.5 px-3 text-sm tabular-nums outline-none focus:ring-2"
        style={{
          border: "1px solid var(--color-light-gray)",
          background: "var(--color-light)",
          color: "var(--color-dark)",
          ["--tw-ring-color" as string]: "var(--color-dark)",
        }}
      />
    </label>
  );
}

/* ── GPR quick estimator ────────────────────────────────────────────────── */
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
              onChange={(e) =>
                setUnits(e.target.value.replace(/[^0-9]/g, ""))
              }
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
              onChange={(e) =>
                setRate(e.target.value.replace(/[^0-9.]/g, ""))
              }
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
            style={{
              background: "var(--color-dark)",
              color: "var(--color-light)",
            }}
          >
            Use {annual > 0 ? usd0(basis === "monthly" ? annual / 12 : annual) : "—"}
          </button>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3" style={{ background: "var(--color-dark)" }}>
      <p
        className="text-[11px] font-medium uppercase tracking-wide mb-0.5"
        style={{ color: "var(--color-mid-gray)" }}
      >
        {label}
      </p>
      <p
        className="text-sm font-bold tabular-nums"
        style={{ color: "var(--color-light)" }}
      >
        {value}
      </p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-base font-semibold mb-1.5"
        style={{ color: "var(--color-dark)" }}
      >
        {q}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--color-body-text)" }}
      >
        {children}
      </p>
    </div>
  );
}

/* csv/display money helper that respects sign with parens handled by caller */
function money(n: number) {
  if (!Number.isFinite(n)) return usd0(0);
  return usd0(n);
}
