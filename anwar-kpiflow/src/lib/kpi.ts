/**
 * KPI score sheet — the shared rules (safe to import from client components).
 *
 * A KPI is one employee's monthly score sheet:
 *   - "KPI Score Break Down": 5 Major Tasks, each scored out of 10 by the employee (KPI (5) = their sum, out of 50)
 *   - the score strip: KPI (5) 50 · Quality of work 15 · Time Line of Deliverables 20 · Stakeholder & Peer Review 5 · Attendance 10 = Total Score 100
 *
 * Approval chain: Employee → Department Head → HR Admin → Finance Admin → Audit Admin.
 *   Employee         the breakdown, Evidence Report, Remarks, Approval Person
 *   Department Head  may adjust the breakdown; fills Quality of work, Time Line of Deliverables, Stakeholder & Peer Review
 *   HR Admin         fills Attendance, Remarks, HR Note and Payment Amount; the Total Score is calculated on their approval
 *   Finance Admin    reviews and approves, or rejects and returns it to the HR Admin
 *   Audit Admin      final verification, or returns it to the Finance Admin
 * The Super Admin has full oversight and may act at any stage.
 */

export const KPI_TASK_COUNT = 5;
export const KPI_TASK_MAX = 10;
export const KPI_SELF_MAX = KPI_TASK_COUNT * KPI_TASK_MAX; // 50
export const KPI_TOTAL_MAX = 100;

export const KPI_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  RETURNED: "RETURNED",
  REJECTED: "REJECTED",
  DEPT_APPROVED: "DEPT_APPROVED",
  RETURNED_TO_HEAD: "RETURNED_TO_HEAD",
  HR_APPROVED: "HR_APPROVED",
  RETURNED_TO_HR: "RETURNED_TO_HR",
  FINANCE_APPROVED: "FINANCE_APPROVED",
  RETURNED_TO_FINANCE: "RETURNED_TO_FINANCE",
  COMPLETED: "COMPLETED",
} as const;
export type KpiStatus = (typeof KPI_STATUS)[keyof typeof KPI_STATUS];

export const STATUS_LABELS: Record<KpiStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  DEPT_APPROVED: "Dept Head Approved",
  RETURNED_TO_HEAD: "Returned to Dept Head",
  HR_APPROVED: "HR Approved",
  RETURNED_TO_HR: "Returned to HR",
  FINANCE_APPROVED: "Finance Approved",
  RETURNED_TO_FINANCE: "Returned to Finance",
  COMPLETED: "Completed",
};

/** One line saying where the KPI is right now. Shown on cards, the detail page and every queue. */
export const STATUS_HINTS: Record<KpiStatus, string> = {
  DRAFT: "Not submitted yet",
  SUBMITTED: "Waiting for the Department Head",
  RETURNED: "Returned to the employee for correction",
  REJECTED: "Rejected by the Department Head",
  DEPT_APPROVED: "Waiting for the HR Admin",
  RETURNED_TO_HEAD: "Returned to the Department Head by the HR Admin",
  HR_APPROVED: "Waiting for the Finance Admin",
  RETURNED_TO_HR: "Returned to the HR Admin by the Finance Admin",
  FINANCE_APPROVED: "Waiting for the Audit Admin",
  RETURNED_TO_FINANCE: "Returned to the Finance Admin by the Audit Admin",
  COMPLETED: "Approved at every stage",
};

/* ---------- Stages ---------- */

export type KpiStage = "EMPLOYEE" | "DEPT" | "HR" | "FINANCE" | "AUDIT";
export const STAGE_ORDER: KpiStage[] = ["EMPLOYEE", "DEPT", "HR", "FINANCE", "AUDIT"];
export const STAGE_LABELS: Record<KpiStage, string> = { EMPLOYEE: "Employee", DEPT: "Department Head", HR: "HR Admin", FINANCE: "Finance Admin", AUDIT: "Audit Admin" };
/** The status routing shown to everyone: Submit → Department Head Approval → HR Admin Approval → Finance Admin → Audit Admin. */
export const ROUTE_STEPS: { stage: KpiStage; label: string }[] = [
  { stage: "EMPLOYEE", label: "Submit" },
  { stage: "DEPT", label: "Department Head Approval" },
  { stage: "HR", label: "HR Admin Approval" },
  { stage: "FINANCE", label: "Finance Admin" },
  { stage: "AUDIT", label: "Audit Admin" },
];

/** Whose turn it is. null = finished (Completed) or closed (Rejected). */
export function stageOf(status: string): KpiStage | null {
  switch (status) {
    case KPI_STATUS.DRAFT:
    case KPI_STATUS.RETURNED:
      return "EMPLOYEE";
    case KPI_STATUS.SUBMITTED:
    case KPI_STATUS.RETURNED_TO_HEAD:
      return "DEPT";
    case KPI_STATUS.DEPT_APPROVED:
    case KPI_STATUS.RETURNED_TO_HR:
      return "HR";
    case KPI_STATUS.HR_APPROVED:
    case KPI_STATUS.RETURNED_TO_FINANCE:
      return "FINANCE";
    case KPI_STATUS.FINANCE_APPROVED:
      return "AUDIT";
    default:
      return null;
  }
}

/** Statuses waiting for each reviewing stage. */
export const STAGE_STATUSES: Record<Exclude<KpiStage, "EMPLOYEE">, KpiStatus[]> = {
  DEPT: [KPI_STATUS.SUBMITTED, KPI_STATUS.RETURNED_TO_HEAD],
  HR: [KPI_STATUS.DEPT_APPROVED, KPI_STATUS.RETURNED_TO_HR],
  FINANCE: [KPI_STATUS.HR_APPROVED, KPI_STATUS.RETURNED_TO_FINANCE],
  AUDIT: [KPI_STATUS.FINANCE_APPROVED],
};

const RETURNED_STATUSES: string[] = [KPI_STATUS.RETURNED, KPI_STATUS.RETURNED_TO_HEAD, KPI_STATUS.RETURNED_TO_HR, KPI_STATUS.RETURNED_TO_FINANCE];
export const isReturned = (status: string) => RETURNED_STATUSES.includes(status);

/** The Department Head's scores are final for the record from here on. */
const PAST_DEPT: string[] = [KPI_STATUS.DEPT_APPROVED, KPI_STATUS.RETURNED_TO_HR, KPI_STATUS.HR_APPROVED, KPI_STATUS.RETURNED_TO_FINANCE, KPI_STATUS.FINANCE_APPROVED, KPI_STATUS.COMPLETED];
export const isPastDept = (status: string) => PAST_DEPT.includes(status);

/**
 * "Approved" for scores, summaries, the dashboard and the leaderboard: the HR Admin has approved,
 * so the Total Score exists. A KPI sent back to HR is being recalculated and does not count until it is approved again.
 */
export const SCORED_STATUSES: KpiStatus[] = [KPI_STATUS.HR_APPROVED, KPI_STATUS.RETURNED_TO_FINANCE, KPI_STATUS.FINANCE_APPROVED, KPI_STATUS.COMPLETED];
export const isScored = (status: string) => (SCORED_STATUSES as string[]).includes(status);

/** Everything still moving through the chain (neither a draft, nor finished, nor rejected). */
export const IN_PROGRESS_STATUSES: KpiStatus[] = [
  KPI_STATUS.SUBMITTED, KPI_STATUS.RETURNED, KPI_STATUS.DEPT_APPROVED, KPI_STATUS.RETURNED_TO_HEAD,
  KPI_STATUS.HR_APPROVED, KPI_STATUS.RETURNED_TO_HR, KPI_STATUS.FINANCE_APPROVED, KPI_STATUS.RETURNED_TO_FINANCE,
];

export type StepState = "done" | "current" | "todo" | "returned" | "rejected";

/** Live state of each step of the status routing. */
export function routeStates(status: string): StepState[] {
  if (status === KPI_STATUS.COMPLETED) return ROUTE_STEPS.map(() => "done");
  if (status === KPI_STATUS.REJECTED) return ["done", "rejected", "todo", "todo", "todo"];
  if (status === KPI_STATUS.DRAFT) return ["current", "todo", "todo", "todo", "todo"];
  const at = STAGE_ORDER.indexOf(stageOf(status) as KpiStage);
  return ROUTE_STEPS.map((_, i) => (i < at ? "done" : i === at ? (isReturned(status) ? "returned" : "current") : "todo"));
}

/* ---------- Score strip ---------- */

export type KpiCriterionKey = "kpiScore" | "qualityOfWork" | "timelineOfDeliverables" | "stakeholderPeerReview" | "attendance";
export const KPI_CRITERIA: { key: KpiCriterionKey; label: string; max: number; by: "DEPT" | "HR" }[] = [
  { key: "kpiScore", label: "KPI (5)", max: 50, by: "DEPT" },
  { key: "qualityOfWork", label: "Quality of work", max: 15, by: "DEPT" },
  { key: "timelineOfDeliverables", label: "Time Line of Deliverables", max: 20, by: "DEPT" },
  { key: "stakeholderPeerReview", label: "Stakeholder & Peer Review", max: 5, by: "DEPT" },
  { key: "attendance", label: "Attendance", max: 10, by: "HR" },
];
/** The three criteria the Department Head types in (KPI (5) is carried from the breakdown). */
export const DEPT_CRITERIA = KPI_CRITERIA.filter((c) => c.by === "DEPT" && c.key !== "kpiScore") as { key: "qualityOfWork" | "timelineOfDeliverables" | "stakeholderPeerReview"; label: string; max: number; by: "DEPT" }[];

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Sum of the task scores; null until every task has a score. */
export function sumTasks(scores: (number | null)[]): number | null {
  if (scores.length !== KPI_TASK_COUNT || scores.some((s) => s === null || Number.isNaN(s))) return null;
  return round2(scores.reduce<number>((a, s) => a + (s as number), 0));
}

/** Running sum that ignores blanks, for the live total while typing. */
export function partialSum(values: (number | null)[]): number | null {
  const filled = values.filter((v): v is number => v !== null && !Number.isNaN(v));
  return filled.length ? round2(filled.reduce((a, b) => a + b, 0)) : null;
}

/** Total Score = KPI (5) + Quality of work + Time Line of Deliverables + Stakeholder & Peer Review + Attendance. null until all five exist. */
export function totalScore(v: Partial<Record<KpiCriterionKey, number | null>>): number | null {
  const parts = KPI_CRITERIA.map((c) => v[c.key] ?? null);
  if (parts.some((p) => p === null)) return null;
  return round2(parts.reduce<number>((a, p) => a + (p as number), 0));
}

/* ---------- Roles ---------- */

type RoleUser = { id?: string; role: string; departmentId?: string | null };

/** Employees and Department Heads have their own KPI sheets; the admin roles only review. */
export function ownsKpis(u: RoleUser): boolean {
  return u.role === "EMPLOYEE" || u.role === "DEPARTMENT_HEAD";
}
/** Only these roles ever see the Payment Amount. Never the employee, never the Department Head. */
export function canSeePayment(u: RoleUser): boolean {
  return u.role === "HR_ADMIN" || u.role === "FINANCE_ADMIN" || u.role === "AUDIT_ADMIN" || u.role === "SUPER_ADMIN";
}
/** The stage this role reviews. The Super Admin reviews every stage. */
export function reviewStagesFor(u: RoleUser): Exclude<KpiStage, "EMPLOYEE">[] {
  switch (u.role) {
    case "SUPER_ADMIN": return ["DEPT", "HR", "FINANCE", "AUDIT"];
    case "DEPARTMENT_HEAD": return ["DEPT"];
    case "HR_ADMIN": return ["HR"];
    case "FINANCE_ADMIN": return ["FINANCE"];
    case "AUDIT_ADMIN": return ["AUDIT"];
    default: return [];
  }
}

type KpiScope = { ownerId: string; approverId: string | null; status: string; owner: { departmentId: string | null; role: string } };

/** A Department Head reviews the employees of their own department, plus any KPI routed to them by name. */
export function inDeptScope(u: RoleUser, k: KpiScope): boolean {
  if (u.role !== "DEPARTMENT_HEAD") return false;
  return k.approverId === u.id || (!!k.owner.departmentId && k.owner.departmentId === u.departmentId && k.owner.role === "EMPLOYEE");
}

/** May this user take the decision the KPI is currently waiting for? Nobody ever acts on their own KPI. */
export function canActOn(u: RoleUser, k: KpiScope): boolean {
  if (k.ownerId === u.id) return false;
  const stage = stageOf(k.status);
  if (!stage || stage === "EMPLOYEE") return false;
  if (u.role === "SUPER_ADMIN") return true;
  if (stage === "DEPT") return inDeptScope(u, k);
  return reviewStagesFor(u).includes(stage);
}

/** May this user open the KPI at all? Drafts belong to their owner alone. */
export function canViewKpi(u: RoleUser, k: KpiScope): boolean {
  if (k.ownerId === u.id) return true;
  if (k.status === KPI_STATUS.DRAFT) return false;
  if (u.role === "SUPER_ADMIN" || u.role === "SYSTEM_ADMIN" || u.role === "HR_ADMIN" || u.role === "FINANCE_ADMIN" || u.role === "AUDIT_ADMIN") return true;
  return inDeptScope(u, k);
}

/* ---------- View model ---------- */

export type KpiTaskView = { sl: number; task: string; score: number | null; employeeScore: number | null; remarks: string };
export type KpiHistoryItem = { id: string; stage: KpiStage; decision: string; reason: string | null; by: string; at: string };
export type KpiEvidenceView = { id: string; fileName: string; size: number; sha256: string; createdAt: string };

/** One KPI as a particular viewer is allowed to see it. Hidden values arrive as null with the matching flag false. */
export type KpiView = {
  id: string;
  status: KpiStatus;
  periodYear: number;
  periodMonth: number;
  owner: { id: string; fullName: string; employeeId: string; designation: string | null; department: string | null; departmentId: string | null; businessUnit: string | null; role: string };
  approver: { id: string; fullName: string } | null;
  tasks: KpiTaskView[];
  selfScore: number | null;
  remarks: string;
  /** Department Head scores are shown to the employee only once the Department Head has approved. */
  showDept: boolean;
  kpiScore: number | null;
  qualityOfWork: number | null;
  timelineOfDeliverables: number | null;
  stakeholderPeerReview: number | null;
  adjusted: boolean;
  adjustReason: string | null;
  /** HR values are shown to the employee only once the HR Admin has approved. */
  showHr: boolean;
  attendance: number | null;
  hrRemarks: string;
  hrNote: string;
  totalScore: number | null;
  showPayment: boolean;
  paymentAmount: number | null;
  financeNote: string | null;
  auditNote: string | null;
  returnRemarks: string | null;
  decisionReason: string | null;
  submittedAt: string | null;
  updatedAt: string;
  currentVersion: number;
  evidence: KpiEvidenceView[];
  history: KpiHistoryItem[];
  deleted: boolean;
};

export const DECISION_LABELS: Record<string, string> = {
  SUBMIT: "Submitted",
  RESUBMIT: "Corrected and resubmitted",
  DEPT_APPROVE: "Approved by the Department Head",
  DEPT_ADJUST: "Adjusted and approved by the Department Head",
  DEPT_RETURN: "Returned to the employee",
  DEPT_REJECT: "Rejected",
  HR_APPROVE: "Approved by the HR Admin",
  HR_RETURN: "Returned to the Department Head",
  FINANCE_APPROVE: "Approved by the Finance Admin",
  FINANCE_RETURN: "Rejected and returned to the HR Admin",
  AUDIT_APPROVE: "Approved by the Audit Admin",
  AUDIT_RETURN: "Returned to the Finance Admin",
  DELETE: "Deleted",
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const kpiTitle = (k: { periodYear: number; periodMonth: number }) => `${MONTH_NAMES[k.periodMonth - 1]} ${k.periodYear}`;
export const quarterOfMonth = (month: number) => Math.floor((month - 1) / 3) + 1;
/** "Month: January | Quarter: 1 | Year: 2026" */
export const periodBreakdown = (k: { periodYear: number; periodMonth: number }) => `Month: ${MONTH_NAMES[k.periodMonth - 1]} | Quarter: ${quarterOfMonth(k.periodMonth)} | Year: ${k.periodYear}`;

/** Today in Bangladesh (UTC+6). */
export function todayBd(now = new Date()): Date {
  return new Date(now.getTime() + 6 * 3600 * 1000);
}
export function isFuturePeriod(year: number, month: number, now = new Date()): boolean {
  const t = todayBd(now);
  return year > t.getUTCFullYear() || (year === t.getUTCFullYear() && month > t.getUTCMonth() + 1);
}
