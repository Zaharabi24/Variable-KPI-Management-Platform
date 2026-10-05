/**
 * Number formatting and KPI periods, shared by forms, detail views, summaries, dashboards and the leaderboard.
 * The KPI scoring rules themselves live in lib/kpi.ts.
 */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const isInt = Number.isInteger(n);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: isInt ? 0 : Math.min(digits, 2),
    maximumFractionDigits: digits,
  });
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(2)}%`;
}

/* ---------- Periods (Section 11.6; OI-05 default = calendar quarters) ---------- */

export type PeriodType = "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface PeriodRange {
  type: PeriodType;
  year: number;
  /** month (1–12) for MONTHLY, quarter (1–4) for QUARTERLY, ignored for YEARLY */
  index: number;
  fromMonth: number;
  toMonth: number;
  label: string;
}

export function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

export function periodRange(type: PeriodType, year: number, index: number): PeriodRange {
  if (type === "MONTHLY") {
    const m = Math.min(12, Math.max(1, index));
    return { type, year, index: m, fromMonth: m, toMonth: m, label: `${MONTH_NAMES[m - 1]} ${year}` };
  }
  if (type === "QUARTERLY") {
    const q = Math.min(4, Math.max(1, index));
    return { type, year, index: q, fromMonth: (q - 1) * 3 + 1, toMonth: q * 3, label: `Q${q} ${year}` };
  }
  return { type, year, index: 1, fromMonth: 1, toMonth: 12, label: `${year}` };
}

export function previousPeriod(p: PeriodRange): PeriodRange {
  if (p.type === "MONTHLY") {
    return p.index === 1 ? periodRange("MONTHLY", p.year - 1, 12) : periodRange("MONTHLY", p.year, p.index - 1);
  }
  if (p.type === "QUARTERLY") {
    return p.index === 1 ? periodRange("QUARTERLY", p.year - 1, 4) : periodRange("QUARTERLY", p.year, p.index - 1);
  }
  return periodRange("YEARLY", p.year - 1, 1);
}

export function periodNoun(type: PeriodType): string {
  return type === "MONTHLY" ? "month" : type === "QUARTERLY" ? "quarter" : "year";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Days remaining until the end of a KPI's month (Bangladesh time, UTC+6). */
export function daysRemainingInPeriod(year: number, month: number, now = new Date()): number {
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // last day of month, UTC
  const endBd = end.getTime() - 6 * 3600 * 1000;
  const diff = endBd - now.getTime();
  return Math.ceil(diff / (24 * 3600 * 1000));
}

export function timeRemainingLabel(year: number, month: number, now = new Date()): string {
  const d = daysRemainingInPeriod(year, month, now);
  if (d > 1) return `${d} days remaining in period`;
  if (d === 1) return "1 day remaining in period";
  if (d === 0) return "Last day of period";
  const past = Math.abs(d);
  return past === 1 ? "Period ended 1 day ago" : `Period ended ${past} days ago`;
}
