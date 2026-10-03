/**
 * Variable Pay — shared, framework-free definitions (safe to import from client components).
 * Field names follow the organisation's Variable Pay sheet exactly.
 */

export const VP_TASK_COUNT = 5;
export const VP_TASK_MAX = 10;

/** Score columns and their maximum ("Score =" row of the sheet). Order is the sheet's column order. */
export const VP_CRITERIA = [
  { key: "kpiScore", label: "KPI (5)", max: VP_TASK_COUNT * VP_TASK_MAX, derived: true },
  { key: "qualityOfWork", label: "Quality of work", max: 15, derived: false },
  { key: "timelineOfDeliverables", label: "Time Line of Deliverables", max: 20, derived: false },
  { key: "stakeholderPeerReview", label: "Stakeholder & Peer Review", max: 5, derived: false },
  { key: "attendance", label: "Attendance", max: 10, derived: false },
] as const;
export type VpCriterionKey = (typeof VP_CRITERIA)[number]["key"];
export type VpManualKey = Exclude<VpCriterionKey, "kpiScore">;
export const VP_MANUAL_CRITERIA = VP_CRITERIA.filter((c) => !c.derived) as unknown as { key: VpManualKey; label: string; max: number }[];
export const VP_TOTAL_MAX = VP_CRITERIA.reduce((a, c) => a + c.max, 0); // 100

export const VP_STATUS = { NOT_STARTED: "NOT_STARTED", DRAFT: "DRAFT", SUBMITTED: "SUBMITTED", RETURNED: "RETURNED" } as const;
export type VpStatus = (typeof VP_STATUS)[keyof typeof VP_STATUS];

export const HR_DEPARTMENT_CODE = "HR";

/** HR reviewers: the Human Resources Department Head and the Super Admin. They read every department's submissions and own the HR Note. */
export function isHrReviewer(u: { role: string; department?: { code: string } | null }): boolean {
  return u.role === "SUPER_ADMIN" || (u.role === "DEPARTMENT_HEAD" && u.department?.code === HR_DEPARTMENT_CODE);
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** KPI (5) = sum of the five task scores; Total Score = KPI (5) + the four other criteria. */
export function vpTotals(taskScores: (number | null)[], manual: Record<VpManualKey, number | null>) {
  const filled = taskScores.filter((s): s is number => s !== null);
  const kpiScore = filled.length ? round2(filled.reduce((a, b) => a + b, 0)) : null;
  const parts = [kpiScore, ...VP_MANUAL_CRITERIA.map((c) => manual[c.key])];
  const present = parts.filter((p): p is number => p !== null);
  const totalScore = present.length ? round2(present.reduce((a, b) => a + b, 0)) : null;
  const complete = filled.length === VP_TASK_COUNT && present.length === parts.length;
  return { kpiScore, totalScore, complete };
}

/** Today's calendar date in Bangladesh, as a UTC-midnight Date (dates are compared as whole days). */
export function todayBd(now = new Date()): Date {
  const bd = new Date(now.getTime() + 6 * 3600 * 1000);
  return new Date(Date.UTC(bd.getUTCFullYear(), bd.getUTCMonth(), bd.getUTCDate()));
}

/** Days and Tenure from DOJ to the as-of date. Days = whole days in service; Tenure = completed years and months. */
export function serviceLength(doj: Date, asOf: Date): { days: number; tenure: string } {
  const a = Date.UTC(doj.getUTCFullYear(), doj.getUTCMonth(), doj.getUTCDate());
  const b = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  const days = Math.max(0, Math.round((b - a) / 86400000));
  let months = (asOf.getUTCFullYear() - doj.getUTCFullYear()) * 12 + (asOf.getUTCMonth() - doj.getUTCMonth());
  if (asOf.getUTCDate() < doj.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  const y = Math.floor(months / 12);
  const m = months % 12;
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const tenure = y > 0 ? `${part(y, "year")} ${part(m, "month")}` : part(m, "month");
  return { days, tenure };
}

/** A period can be evaluated once it has started (no evaluations for future months). */
export function isFuturePeriod(year: number, month: number, now = new Date()): boolean {
  const t = todayBd(now);
  return year > t.getUTCFullYear() || (year === t.getUTCFullYear() && month > t.getUTCMonth() + 1);
}

export type VpTaskRow = { sl: number; task: string; score: number | null; remarks: string };

/** One line of the "Individual" sheet, as the screens consume it. */
export type VpRow = {
  employeeId: string;
  evaluationId: string | null;
  status: VpStatus;
  empCode: string;
  name: string;
  doj: string | null;
  days: number | null;
  tenure: string | null;
  designation: string | null;
  department: string | null;
  supervisor: string | null;
  kpiScore: number | null;
  qualityOfWork: number | null;
  timelineOfDeliverables: number | null;
  stakeholderPeerReview: number | null;
  attendance: number | null;
  totalScore: number | null;
  remarks: string;
  hrNote: string;
  hrNoteMeta: string | null;
  returnReason: string | null;
  submittedAt: string | null;
  evaluatorName: string | null;
  tasks: VpTaskRow[];
};

/** One line of the eligibility roster a Department Head manages. */
export type VpRosterRow = {
  id: string;
  empCode: string;
  name: string;
  designation: string | null;
  eligible: boolean;
  doj: string; // yyyy-mm-dd or ""
  supervisor: string;
};
