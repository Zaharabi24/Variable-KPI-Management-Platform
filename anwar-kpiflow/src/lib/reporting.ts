import { db } from "./db";
import { periodNoun, periodRange, previousPeriod, quarterOf, round2, type PeriodRange, type PeriodType } from "./calc";
import { LEADERBOARD_BANDS, MONTHS_SHORT, ROLES } from "./constants";
import { KPI_STATUS, SCORED_STATUSES, STAGE_STATUSES, isPastDept, isScored, type KpiStatus } from "./kpi";
import { kpiInclude, toView, type Viewer } from "./kpi-data";

/**
 * Reporting — summaries, dashboards and the leaderboard.
 * A KPI counts towards a score once the HR Admin has approved it (its Total Score out of 100 exists).
 */

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

const inRange = (p: PeriodRange) => ({ periodYear: p.year, periodMonth: { gte: p.fromMonth, lte: p.toMonth } });
const mean = (values: number[]): number | null => (values.length ? round2(values.reduce((a, b) => a + b, 0) / values.length) : null);
type Scored = { status: string; totalScore: number | null };
/** Average Total Score over the KPIs the HR Admin has approved. */
export function averageScore(items: Scored[]): number | null {
  return mean(items.filter((k) => isScored(k.status) && k.totalScore !== null).map((k) => k.totalScore as number));
}

/* ---------- Employee: Performance Summary ---------- */

export async function performanceSummary(viewer: Viewer, p: PeriodRange) {
  const prev = previousPeriod(p);
  const base = { ownerId: viewer.id, deletedAt: null, status: { not: KPI_STATUS.DRAFT } };
  const [current, previous] = await Promise.all([
    db.kpi.findMany({ where: { ...base, ...inRange(p) }, include: kpiInclude, orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }] }),
    db.kpi.findMany({ where: { ...base, ...inRange(prev) }, select: { status: true, totalScore: true } }),
  ]);
  const total = averageScore(current);
  const prevTotal = averageScore(previous);
  const diff = total !== null && prevTotal !== null ? round2(total - prevTotal) : null;
  return {
    period: p,
    previous: prev,
    /** Approved records only: the ones whose Total Score exists. */
    records: current.filter((k) => isScored(k.status)).map((k) => toView(k, viewer)),
    metrics: {
      totalKpiScore: total,
      previousKpiScore: prevTotal,
      difference: diff,
      differenceText: diff === null ? null : `${Math.abs(diff)} ${diff >= 0 ? "above" : "below"} the previous ${periodNoun(p.type)}`,
      approvedCount: current.filter((k) => isScored(k.status)).length,
      totalCount: current.length,
    },
  };
}

/** Bar-chart series: monthly (12 months of the year), quarterly (4), yearly (last 3 years). */
export async function chartSeries(userId: string, year: number) {
  const kpis = await db.kpi.findMany({
    where: { ownerId: userId, deletedAt: null, status: { in: SCORED_STATUSES }, periodYear: { gte: year - 2, lte: year } },
    select: { periodYear: true, periodMonth: true, status: true, totalScore: true },
  });
  const point = (label: string, items: typeof kpis) => ({ label, value: averageScore(items), count: items.length });
  return {
    monthly: MONTHS_SHORT.map((m, i) => point(m, kpis.filter((k) => k.periodYear === year && k.periodMonth === i + 1))),
    quarterly: [1, 2, 3, 4].map((q) => point(`Q${q}`, kpis.filter((k) => k.periodYear === year && quarterOf(k.periodMonth) === q))),
    yearly: [year - 2, year - 1, year].map((y) => point(String(y), kpis.filter((k) => k.periodYear === y))),
  };
}

/* ---------- Department Head / Super Admin dashboard ---------- */

/** departmentId = null means all departments (Super Admin). */
export async function departmentDashboard(viewer: Viewer, departmentId: string | null, p: PeriodRange) {
  const employees = await db.user.count({
    where: { role: { in: [ROLES.EMPLOYEE, ROLES.DEPARTMENT_HEAD] }, ...(departmentId ? { departmentId } : {}), status: { not: "DEACTIVATED" } },
  });
  const rows = await db.kpi.findMany({
    where: { deletedAt: null, status: { not: KPI_STATUS.DRAFT }, ...inRange(p), owner: { role: { in: [ROLES.EMPLOYEE, ROLES.DEPARTMENT_HEAD] }, ...(departmentId ? { departmentId } : {}) } },
    include: kpiInclude,
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { updatedAt: "desc" }],
  });
  const count = (...s: KpiStatus[]) => rows.filter((k) => (s as string[]).includes(k.status)).length;
  return {
    period: p,
    employees,
    kpis: rows.map((k) => toView(k, viewer)),
    averageKpiScore: averageScore(rows),
    pending: count(...STAGE_STATUSES.DEPT),
    approved: rows.filter((k) => isPastDept(k.status)).length,
    rejected: count(KPI_STATUS.REJECTED),
    returned: count(KPI_STATUS.RETURNED),
  };
}

/* ---------- Leaderboard ---------- */

export type LeaderboardRow = { rank: number; userId: string; name: string; designation: string; employeeId: string; score: number; band: "high" | "middle" | "low"; kpiCount: number };

/** Ranked by average Total Score; ties share a rank, alphabetical within a tie. */
export async function departmentLeaderboard(departmentId: string, p: PeriodRange): Promise<LeaderboardRow[]> {
  const employees = await db.user.findMany({ where: { departmentId, role: ROLES.EMPLOYEE, status: { not: "DEACTIVATED" } } });
  const kpis = await db.kpi.findMany({
    where: { ownerId: { in: employees.map((e) => e.id) }, deletedAt: null, status: { in: SCORED_STATUSES }, ...inRange(p) },
    select: { ownerId: true, status: true, totalScore: true },
  });
  const rows = employees
    .map((e) => {
      const mine = kpis.filter((k) => k.ownerId === e.id);
      const score = averageScore(mine);
      return score === null ? null : { userId: e.id, name: e.fullName, designation: e.designation ?? "Employee", employeeId: e.employeeId, score, kpiCount: mine.length };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));
  let rank = 0;
  let last: number | null = null;
  return rows.map((r, i) => {
    if (last === null || r.score !== last) { rank = i + 1; last = r.score; }
    return { ...r, rank, band: bandFor(r.score) };
  });
}

export function bandFor(a: number): "high" | "middle" | "low" {
  if (a >= LEADERBOARD_BANDS.high) return "high";
  if (a >= LEADERBOARD_BANDS.middle) return "middle";
  return "low";
}

/* ---------- HR Admin, Finance Admin and Audit Admin dashboards ---------- */

export type AdminStage = "HR" | "FINANCE" | "AUDIT";
export type ChartPoint = { label: string; value: number | null; count: number };

const STAGE_VIEW: Record<AdminStage, { received: KpiStatus[]; approved: KpiStatus[]; returned: KpiStatus }> = {
  HR: {
    received: [KPI_STATUS.DEPT_APPROVED, KPI_STATUS.RETURNED_TO_HR, KPI_STATUS.RETURNED_TO_HEAD, ...SCORED_STATUSES],
    approved: SCORED_STATUSES,
    returned: KPI_STATUS.RETURNED_TO_HEAD,
  },
  FINANCE: {
    received: [KPI_STATUS.HR_APPROVED, KPI_STATUS.RETURNED_TO_FINANCE, KPI_STATUS.RETURNED_TO_HR, KPI_STATUS.FINANCE_APPROVED, KPI_STATUS.COMPLETED],
    approved: [KPI_STATUS.FINANCE_APPROVED, KPI_STATUS.COMPLETED],
    returned: KPI_STATUS.RETURNED_TO_HR,
  },
  AUDIT: {
    received: [KPI_STATUS.FINANCE_APPROVED, KPI_STATUS.RETURNED_TO_FINANCE, KPI_STATUS.COMPLETED],
    approved: [KPI_STATUS.COMPLETED],
    returned: KPI_STATUS.RETURNED_TO_FINANCE,
  },
};

/**
 * One dashboard shape for the three admin stages, for a period and optional Business Unit / Department.
 * "Received" is everything that has reached the stage; payments are summed over what the stage has approved.
 */
export async function stageDashboard(stage: AdminStage, p: PeriodRange, f: { bu: string; dept: string }) {
  const view = STAGE_VIEW[stage];
  const owner = { ...(f.dept ? { departmentId: f.dept } : {}), ...(f.bu ? { businessUnitId: f.bu } : {}) };
  const select = { status: true, totalScore: true, paymentAmount: true, periodMonth: true, periodYear: true, owner: { select: { department: { select: { name: true } }, businessUnit: { select: { name: true } } } } } as const;
  const [rows, yearRows, pipeline] = await Promise.all([
    db.kpi.findMany({ where: { deletedAt: null, status: { in: view.received }, ...inRange(p), owner }, select }),
    // The trend always covers the whole year of the selected period.
    db.kpi.findMany({ where: { deletedAt: null, status: { in: view.received }, periodYear: p.year, owner }, select }),
    db.kpi.groupBy({ by: ["status"], where: { deletedAt: null, status: { not: KPI_STATUS.DRAFT }, ...inRange(p), owner }, _count: true }),
  ]);
  const has = (list: KpiStatus[], s: string) => (list as string[]).includes(s);
  const approved = rows.filter((k) => has(view.approved, k.status));
  const pay = (items: typeof rows) => round2(items.reduce((a, k) => a + (k.paymentAmount ?? 0), 0));
  const group = (key: (k: (typeof rows)[number]) => string) => {
    const map = new Map<string, typeof rows>();
    for (const k of rows) map.set(key(k), [...(map.get(key(k)) ?? []), k]);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };
  const stageCount = (statuses: KpiStatus[]) => pipeline.filter((g) => has(statuses, g.status)).reduce((a, g) => a + g._count, 0);

  return {
    stage,
    period: p,
    received: rows.length,
    awaiting: rows.filter((k) => has(STAGE_STATUSES[stage], k.status)).length,
    approved: approved.length,
    returned: rows.filter((k) => k.status === view.returned).length,
    completed: rows.filter((k) => k.status === KPI_STATUS.COMPLETED).length,
    averageScore: averageScore(rows),
    payment: pay(approved),
    byDepartment: group((k) => k.owner.department?.name ?? "No department").map<ChartPoint & { payment: number }>(([label, items]) => ({ label, value: averageScore(items), count: items.length, payment: pay(items.filter((k) => has(view.approved, k.status))) })),
    byBusinessUnit: group((k) => k.owner.businessUnit?.name ?? "No business unit").map<ChartPoint & { payment: number }>(([label, items]) => ({ label, value: averageScore(items), count: items.length, payment: pay(items.filter((k) => has(view.approved, k.status))) })),
    monthly: MONTHS_SHORT.map<ChartPoint & { payment: number }>((label, i) => {
      const items = yearRows.filter((k) => k.periodMonth === i + 1);
      return { label, value: averageScore(items), count: items.length, payment: pay(items.filter((k) => has(view.approved, k.status))) };
    }),
    /** Where every submitted KPI of the period currently sits in the chain. */
    pipeline: [
      { label: "Department Head", count: stageCount([...STAGE_STATUSES.DEPT, KPI_STATUS.RETURNED]) },
      { label: "HR Admin", count: stageCount(STAGE_STATUSES.HR) },
      { label: "Finance Admin", count: stageCount(STAGE_STATUSES.FINANCE) },
      { label: "Audit Admin", count: stageCount(STAGE_STATUSES.AUDIT) },
      { label: "Completed", count: stageCount([KPI_STATUS.COMPLETED]) },
    ],
  };
}

export type StageDashboard = Awaited<ReturnType<typeof stageDashboard>>;
