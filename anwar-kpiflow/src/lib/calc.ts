/**
 * Calculation service — the single implementation of BRD Section 11.
 * Used by forms (preview), detail views, summaries, dashboards and the leaderboard (NFR-20).
 */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Achievement (%) = Actual / Target × 100 (Section 11.1). Target must be > 0. */
export function achievementPct(target: number, actual: number): number {
  if (!(target > 0)) return 0;
  return round2((actual / target) * 100);
}

/** Calculated Score = Achievement (%) — no curve, no cap in Phase 01 (Section 11.2). */
export function calculatedScore(achievement: number): number {
  return round2(achievement);
}

/** Weighted Score = Final Score × Weight / 100 (Section 11.3). */
export function weightedScore(finalScore: number, weight: number): number {
  return round2((finalScore * weight) / 100);
}

/** Total KPI Score = Σ(Final × Weight) / Σ Weight, over Approved + Adjusted KPIs only (Section 11.3). */
export function totalKpiScore(items: { finalScore: number | null; weight: number; status: string }[]): number | null {
  const counted = items.filter((k) => isCounted(k.status) && k.finalScore !== null);
  const sumW = counted.reduce((a, k) => a + k.weight, 0);
  if (sumW <= 0) return null;
  const sum = counted.reduce((a, k) => a + (k.finalScore as number) * k.weight, 0);
  return round2(sum / sumW);
}

/** Average Achievement = simple mean of Achievement % over Approved + Adjusted KPIs (Section 11.4). */
export function averageAchievement(items: { achievement: number; status: string }[]): number | null {
  const counted = items.filter((k) => isCounted(k.status));
  if (counted.length === 0) return null;
  return round2(counted.reduce((a, k) => a + k.achievement, 0) / counted.length);
}

export function isCounted(status: string): boolean {
  return status === "APPROVED" || status === "ADJUSTED";
}

export function formulaText(target: number, actual: number): string {
  return `(actual ${fmtNum(actual)} / target ${fmtNum(target)}) * 100`;
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

export function inPeriod(k: { periodYear: number; periodMonth: number }, p: PeriodRange): boolean {
  return k.periodYear === p.year && k.periodMonth >= p.fromMonth && k.periodMonth <= p.toMonth;
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
