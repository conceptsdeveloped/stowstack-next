/**
 * Self-storage NOI calculation — pure logic, no React.
 *
 * NOI = Effective Gross Income (EGI) − Operating Expenses (OpEx).
 * Excluded from NOI on purpose: debt service, depreciation, amortization,
 * capital expenditures, income taxes.
 *
 * All amounts are ANNUAL dollars. The UI's monthly/annual toggle is a display
 * concern and lives in the client component, not here.
 */

import { clampPct, usd0, usd2, pct } from "./format";

export interface FieldDef {
  key: string;
  label: string;
  help?: string;
}

export const OTHER_INCOME_FIELDS: FieldDef[] = [
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
    help: "Locks, boxes, packing supplies sold at the counter (track cost below).",
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

export const EXPENSE_FIELDS: FieldDef[] = [
  {
    key: "payroll",
    label: "On-site payroll & wages",
    help: "Manager + relief/part-time wages. Exclude your own draw if you don't pay yourself a market wage.",
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
    help: "Electric, water, sewer, gas, trash — lights, gate, climate control.",
  },
  {
    key: "repairs",
    label: "Repairs & maintenance",
    help: "Doors, springs, gate motor, asphalt patching, HVAC service (not capex).",
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

export interface NoiState {
  facilityName: string;
  totalUnits: number;
  rentableSqft: number;
  gpr: number;
  vacancyPct: number;
  tenantInsurance: number;
  lateFees: number;
  adminFees: number;
  merchandise: number;
  truckRental: number;
  otherIncome: number;
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
  capRatePct: number;
}

export const NOI_DEFAULTS: NoiState = {
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

export interface NoiResult {
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

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function deriveNoi(s: NoiState): NoiResult {
  const gpr = Math.max(0, num(s.gpr));
  const vacancyLoss = gpr * (clampPct(s.vacancyPct) / 100);
  const rentalIncomeNet = gpr - vacancyLoss;
  const otherIncomeTotal =
    num(s.tenantInsurance) +
    num(s.lateFees) +
    num(s.adminFees) +
    num(s.merchandise) +
    num(s.truckRental) +
    num(s.otherIncome);
  const egi = rentalIncomeNet + otherIncomeTotal;

  const managementFee = egi * (clampPct(s.managementPct) / 100);

  const lineExpenses = EXPENSE_FIELDS.reduce(
    (sum, f) => sum + num((s as unknown as Record<string, number>)[f.key]),
    0,
  );
  const opexTotal = managementFee + lineExpenses;

  const noi = egi - opexTotal;
  const noiMargin = egi > 0 ? (noi / egi) * 100 : 0;
  const expenseRatio = egi > 0 ? (opexTotal / egi) * 100 : 0;
  const noiPerUnit = num(s.totalUnits) > 0 ? noi / s.totalUnits : 0;
  const noiPerSqft = num(s.rentableSqft) > 0 ? noi / s.rentableSqft : 0;
  const cap = clampPct(s.capRatePct);
  const impliedValue = cap > 0 ? noi / (cap / 100) : 0;

  const expenseLines = [
    { label: "Property management fee", amount: managementFee },
    ...EXPENSE_FIELDS.map((f) => ({
      label: f.label,
      amount: num((s as unknown as Record<string, number>)[f.key]),
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

export type CsvRow = [string, string, string];

/**
 * Build the rows for a NOI export. Pure (no DOM) so it can be unit-tested; the
 * client wraps the result in a Blob and triggers the download.
 */
export function buildNoiCsvRows(s: NoiState, d: NoiResult): CsvRow[] {
  return [
    ["Line item", "Annual", "Monthly"],
    ["Gross potential rent", usd0(d.gpr), usd0(d.gpr / 12)],
    [
      `Less vacancy & credit loss (${pct(s.vacancyPct)})`,
      usd0(-d.vacancyLoss),
      usd0(-d.vacancyLoss / 12),
    ],
    ["Net rental income", usd0(d.rentalIncomeNet), usd0(d.rentalIncomeNet / 12)],
    ["Other income", usd0(d.otherIncomeTotal), usd0(d.otherIncomeTotal / 12)],
    ["Effective gross income (EGI)", usd0(d.egi), usd0(d.egi / 12)],
    ...d.expenseLines.map(
      (l) => [`  ${l.label}`, usd0(-l.amount), usd0(-l.amount / 12)] as CsvRow,
    ),
    ["Total operating expenses", usd0(-d.opexTotal), usd0(-d.opexTotal / 12)],
    ["NET OPERATING INCOME (NOI)", usd0(d.noi), usd0(d.noi / 12)],
    ["NOI margin", pct(d.noiMargin), ""],
    ["Operating expense ratio", pct(d.expenseRatio), ""],
    ["NOI per unit", s.totalUnits > 0 ? usd0(d.noiPerUnit) : "n/a", ""],
    [
      "NOI per rentable sq ft",
      s.rentableSqft > 0 ? usd2(d.noiPerSqft) : "n/a",
      "",
    ],
    [`Implied value @ ${pct(s.capRatePct)} cap`, usd0(d.impliedValue), ""],
  ];
}

/** Serialize rows to RFC-4180-ish CSV text, quoting every cell. */
export function rowsToCsv(rows: CsvRow[]): string {
  return rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/** Derive a safe download filename from the facility name. */
export function noiCsvFileName(facilityName: string): string {
  const slug = (facilityName || "facility")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `noi-${slug || "storage"}.csv`;
}
