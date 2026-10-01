import { db } from "./db";
import {
  averageAchievement, inPeriod, isCounted, periodNoun, periodRange, previousPeriod, quarterOf, round2, totalKpiScore,
  type PeriodRange, type PeriodType,
} from "./calc";
import { LEADERBOARD_BANDS, ROLES } from "./constants";

/** Reporting service (Section 11.4 / 11.5) — reads use the calculation service only. */

export type PeriodQuery = { type: PeriodType; year: number; index: number };

export function parsePeriod(sp: Record<string, string | string[] | undefined>, now = new Date()): PeriodRange {
  const bdNow = new Date(now.getTime() + 6 * 3600 * 1000);
  const type = (["MONTHLY", "QUARTERLY", "YEARLY"].includes(String(sp.type)) ? String(sp.type) : "MONTHLY") as PeriodType;
  const year = Number(sp.year) || bdNow.getUTCFullYear();
  const month = Number(sp.month) || bdNow.getUTCMonth() + 1;
  const quarter = Number(sp.quarter) || quarterOf(month);
  const index = type === "MONTHLY" ? month : type === "QUARTERLY" ? quarter : 1;
  return periodRange(type, year, index);
}

export function periodToQuery(p: PeriodRange): Record<string, string> {
  return {
    type: p.type,
    year: String(p.year),
    month: String(p.type === "MONTHLY" ? p.index : p.fromMonth),
    quarter: String(p.type === "QUARTERLY" ? p.index : quarterOf(p.fromMonth)),
  };
}

export async function performanceSummary(userId: string, p: PeriodRange) {
  const prev = previousPeriod(p);
  const all = await db.kpi.findMany({
    where: { ownerId: userId, deletedAt: null, status: { not: "DRAFT" }, periodYear: { in: [p.year, prev.year] } },
    include: { approver: true, evidence: { omit: { data: true } } },
    orderBy: [{ periodMonth: "asc" }, { submittedAt: "asc" }],
  });
  const current = all.filter((k) => inPeriod(k, p));
  const previous = all.filter((k) => inPeriod(k, prev));
  const total = totalKpiScore(current);
  const prevTotal = totalKpiScore(previous);
  const diff = total !== null && prevTotal !== null ? round2(total - prevTotal) : null;
  const approved = current.filter((k) => isCounted(k.status)).length;
  return {
    period: p,
    previous: prev,
    kpis: current,
    metrics: {
      totalKpiScore: total,
      averageAchievement: averageAchievement(current),
      previousKpiScore: prevTotal,
      difference: diff,
      differenceText:
        diff === null ? null : `${Math.abs(diff)} ${diff >= 0 ? "above" : "below"} the previous ${periodNoun(p.type)}`,
      approvedCount: approved,
      totalCount: current.length,
    },
  };
}

/** Bar-chart series: monthly (12 months of the year), quarterly (4), yearly (last 3 years). */
export async function chartSeries(userId: string, year: number) {
  const kpis = await db.kpi.findMany({
    where: { ownerId: userId, deletedAt: null, status: { not: "DRAFT" }, periodYear: { gte: year - 2, lte: year } },
  });
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const items = kpis.filter((k) => k.periodYear === year && k.periodMonth === i + 1);
    return { label: MONTHS_SHORT[i], value: totalKpiScore(items), count: items.filter((k) => isCounted(k.status)).length };
  });
  const quarterly = Array.from({ length: 4 }, (_, q) => {
    const items = kpis.filter((k) => k.periodYear === year && quarterOf(k.periodMonth) === q + 1);
    return { label: `Q${q + 1}`, value: totalKpiScore(items), count: items.filter((k) => isCounted(k.status)).length };
  });
  const yearly = [year - 2, year - 1, year].map((y) => {
    const items = kpis.filter((k) => k.periodYear === y);
    return { label: String(y), value: totalKpiScore(items), count: items.filter((k) => isCounted(k.status)).length };
  });
  return { monthly, quarterly, yearly };
}

/** Department dashboard (Section 11.5). departmentId = null means all departments (Super Admin). */
export async function departmentDashboard(departmentId: string | null, p: PeriodRange) {
  const employees = await db.user.findMany({
    where: {
      role: { in: [ROLES.EMPLOYEE, ROLES.DEPARTMENT_HEAD] },
      ...(departmentId ? { departmentId } : {}),
      status: { not: "DEACTIVATED" },
    },
    include: { department: true },
  });
  const ids = employees.map((e) => e.id);
  const kpis = await db.kpi.findMany({
    where: { ownerId: { in: ids }, deletedAt: null, status: { not: "DRAFT" }, periodYear: p.year, periodMonth: { gte: p.fromMonth, lte: p.toMonth } },
    include: { owner: { include: { department: true } } },
    orderBy: { submittedAt: "asc" },
  });
  // Department average = average of each employee's Average Achievement (11.5)
  const perEmployee = employees
    .map((e) => averageAchievement(kpis.filter((k) => k.ownerId === e.id)))
    .filter((v): v is number => v !== null);
  const avg = perEmployee.length ? round2(perEmployee.reduce((a, b) => a + b, 0) / perEmployee.length) : null;
  return {
    period: p,
    employees,
    kpis,
    averageAchievement: avg,
    pending: kpis.filter((k) => k.status === "SUBMITTED").length,
    approved: kpis.filter((k) => isCounted(k.status)).length,
    rejected: kpis.filter((k) => k.status === "REJECTED").length,
    returned: kpis.filter((k) => k.status === "RETURNED").length,
    belowTarget: kpis.filter((k) => k.actual < k.target).sort((a, b) => a.achievement - b.achievement),
  };
}

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  designation: string;
  employeeId: string;
  achievement: number;
  band: "high" | "middle" | "low";
  kpiCount: number;
};

/** Leaderboard (FR-LB / 11.5): ranked by Average Achievement, ties share a rank, alphabetical within tie. */
export async function departmentLeaderboard(departmentId: string, p: PeriodRange): Promise<LeaderboardRow[]> {
  const employees = await db.user.findMany({
    where: { departmentId, role: ROLES.EMPLOYEE, status: { not: "DEACTIVATED" } },
  });
  const kpis = await db.kpi.findMany({
    where: { ownerId: { in: employees.map((e) => e.id) }, deletedAt: null, status: { not: "DRAFT" }, periodYear: p.year, periodMonth: { gte: p.fromMonth, lte: p.toMonth } },
  });
  const rows = employees
    .map((e) => {
      const mine = kpis.filter((k) => k.ownerId === e.id);
      const a = averageAchievement(mine);
      return a === null
        ? null
        : { userId: e.id, name: e.fullName, designation: e.designation ?? "Employee", employeeId: e.employeeId, achievement: a, kpiCount: mine.filter((k) => isCounted(k.status)).length };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((x, y) => y.achievement - x.achievement || x.name.localeCompare(y.name));
  let rank = 0;
  let last: number | null = null;
  return rows.map((r, i) => {
    if (last === null || r.achievement !== last) { rank = i + 1; last = r.achievement; }
    return { ...r, rank, band: bandFor(r.achievement) };
  });
}

export function bandFor(a: number): "high" | "middle" | "low" {
  if (a >= LEADERBOARD_BANDS.high) return "high";
  if (a >= LEADERBOARD_BANDS.middle) return "middle";
  return "low";
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
