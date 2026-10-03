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

/**
 * Workflow: DRAFT -> SUBMITTED -> APPROVED -> PAYMENT_CONFIRMED
 *                       |-> RETURNED (feedback) -> SUBMITTED again
 *                       |-> REJECTED (final)
 * NOT_STARTED is a display state for an eligible employee with no record yet.
 */
export const VP_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  RETURNED: "RETURNED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
} as const;
export type VpStatus = (typeof VP_STATUS)[keyof typeof VP_STATUS];

export const VP_STATUS_LABELS: Record<VpStatus, string> = {
  NOT_STARTED: "Not started",
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  RETURNED: "Returned",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAYMENT_CONFIRMED: "Payment confirmed",
};

/** Statuses the Department Head may still edit. Everything else is locked. */
export const VP_EDITABLE: string[] = [VP_STATUS.DRAFT, VP_STATUS.RETURNED];
/** What the Super Admin and HR see (drafts stay private to the Department Head). */
export const VP_REVIEW_STATUSES: VpStatus[] = [VP_STATUS.SUBMITTED, VP_STATUS.RETURNED, VP_STATUS.APPROVED, VP_STATUS.REJECTED, VP_STATUS.PAYMENT_CONFIRMED];
/** What the Finance Admin sees: approved requests and their payment history. */
export const VP_FINANCE_STATUSES: VpStatus[] = [VP_STATUS.APPROVED, VP_STATUS.PAYMENT_CONFIRMED];

export const VP_EVENT_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted for approval",
  RESUBMITTED: "Resubmitted after correction",
  APPROVED: "Approved",
  RETURNED: "Returned for correction",
  REJECTED: "Rejected",
  HR_NOTE: "HR note updated",
  PAYMENT_CONFIRMED: "Payment confirmed",
};

export const HR_DEPARTMENT_CODE = "HR";

type RoleUser = { role: string; department?: { code: string } | null };

/** The Super Admin approves, returns or rejects submitted requests. */
export function isVpApprover(u: RoleUser): boolean {
  return u.role === "SUPER_ADMIN";
}
/** HR reviewers read every department's requests and own the HR Note: the Human Resources Department Head and the Super Admin. */
export function isHrReviewer(u: RoleUser): boolean {
  return u.role === "SUPER_ADMIN" || (u.role === "DEPARTMENT_HEAD" && u.department?.code === HR_DEPARTMENT_CODE);
}
/** Finance Admin: the dedicated role that receives approved requests and confirms the payment amount. */
export function isVpFinance(u: RoleUser): boolean {
  return u.role === "FINANCE_ADMIN";
}

export type VpMode = "department" | "review" | "finance";

/** Which Variable Pay views a user may open, in default order. Empty means no access. */
export function vpScopes(u: RoleUser & { departmentId?: string | null }): VpMode[] {
  const scopes: VpMode[] = [];
  if (u.role === "DEPARTMENT_HEAD" && u.departmentId) scopes.push("department");
  if (isHrReviewer(u)) scopes.push("review");
  if (isVpFinance(u)) scopes.push("finance");
  return scopes;
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
export type VpEventRow = { id: string; action: string; actor: string; comment: string | null; at: string };

/** One Variable Pay request: a line of the "Individual" sheet plus its workflow state. */
export type VpRow = {
  key: string;
  employeeId: string;
  evaluationId: string | null;
  status: VpStatus;
  periodYear: number;
  periodMonth: number;
  businessUnit: string | null;
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
  decisionComment: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  paymentAmount: number | null;
  paymentReference: string | null;
  paymentNote: string | null;
  paymentConfirmedAt: string | null;
  paymentConfirmedBy: string | null;
  tasks: VpTaskRow[];
  events: VpEventRow[];
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

export type VpFilters = { dept: string; bu: string; status: string; from: string; to: string };
export type VpOption = { id: string; name: string };
