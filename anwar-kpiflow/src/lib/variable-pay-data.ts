import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { ROLES, USER_STATUS } from "./constants";
import {
  VP_EDITABLE, VP_FINANCE_STATUSES, VP_REVIEW_STATUSES, VP_STATUS, VP_TASK_COUNT, isFinanceMember, isVpApprover, serviceLength, todayBd, vpScopes,
  type VpFilters, type VpMode, type VpOption, type VpRosterRow, type VpRow, type VpStatus, type VpTaskRow,
} from "./variable-pay";

const include = {
  tasks: { orderBy: { sl: "asc" as const } },
  events: { orderBy: { createdAt: "asc" as const }, include: { actor: { select: { fullName: true } } } },
  evaluator: { select: { fullName: true } },
  hrNoteBy: { select: { fullName: true } },
  decidedBy: { select: { fullName: true } },
  paymentConfirmedBy: { select: { fullName: true } },
  employee: { select: { businessUnit: { select: { name: true } } } },
} satisfies Prisma.VariablePayEvaluationInclude;

type EvalFull = Prisma.VariablePayEvaluationGetPayload<{ include: typeof include }>;

function emptyTasks(seed: string[] = []): VpTaskRow[] {
  return Array.from({ length: VP_TASK_COUNT }, (_, i) => ({ sl: i + 1, task: seed[i] ?? "", score: null, remarks: "" }));
}

function tasksOf(ev: EvalFull): VpTaskRow[] {
  const bySl = new Map(ev.tasks.map((t) => [t.sl, t]));
  return emptyTasks().map((t) => {
    const s = bySl.get(t.sl);
    return s ? { sl: t.sl, task: s.task, score: s.score, remarks: s.remarks ?? "" } : t;
  });
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const fmtAt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function rowFromEvaluation(ev: EvalFull): VpRow {
  return {
    key: ev.id,
    employeeId: ev.employeeId,
    evaluationId: ev.id,
    status: ev.status as VpStatus,
    periodYear: ev.periodYear,
    periodMonth: ev.periodMonth,
    businessUnit: ev.employee.businessUnit?.name ?? null,
    empCode: ev.empCode,
    name: ev.empName,
    doj: iso(ev.doj),
    days: ev.days,
    tenure: ev.tenure,
    designation: ev.designation,
    department: ev.departmentName,
    supervisor: ev.supervisor,
    kpiScore: ev.kpiScore,
    qualityOfWork: ev.qualityOfWork,
    timelineOfDeliverables: ev.timelineOfDeliverables,
    stakeholderPeerReview: ev.stakeholderPeerReview,
    attendance: ev.attendance,
    totalScore: ev.totalScore,
    remarks: ev.remarks ?? "",
    hrNote: ev.hrNote ?? "",
    hrNoteMeta: ev.hrNoteAt ? `${ev.hrNoteBy?.fullName ?? "HR"} · ${fmtAt(ev.hrNoteAt)}` : null,
    returnReason: ev.returnReason,
    submittedAt: iso(ev.submittedAt),
    evaluatorName: ev.evaluator.fullName,
    decisionComment: ev.decisionComment,
    decidedAt: iso(ev.decidedAt),
    decidedBy: ev.decidedBy?.fullName ?? null,
    paymentAmount: ev.paymentAmount,
    paymentReference: ev.paymentReference,
    paymentNote: ev.paymentNote,
    paymentConfirmedAt: iso(ev.paymentConfirmedAt),
    paymentConfirmedBy: ev.paymentConfirmedBy?.fullName ?? null,
    tasks: tasksOf(ev),
    events: ev.events.map((e) => ({ id: e.id, action: e.action, actor: e.actor.fullName, comment: e.comment, at: e.createdAt.toISOString() })),
  };
}

/**
 * Department Head view: every eligible employee in the department for the month, with their request if one exists.
 * While a request is still editable (Draft or Returned) the employee columns are live (DOJ, Days and Tenure as of today);
 * from submission onwards they are the stored snapshot. A new evaluation is pre-filled with the previous month's task names.
 */
export async function departmentSheet(departmentId: string, headName: string, year: number, month: number): Promise<{ rows: VpRow[]; roster: VpRosterRow[] }> {
  const employees = await db.user.findMany({
    where: { departmentId, role: ROLES.EMPLOYEE, status: { not: USER_STATUS.DEACTIVATED } },
    include: { department: true, businessUnit: true },
    orderBy: { fullName: "asc" },
  });
  const ids = employees.map((e) => e.id);
  const [evaluations, previous] = await Promise.all([
    db.variablePayEvaluation.findMany({ where: { employeeId: { in: ids }, periodYear: year, periodMonth: month }, include }),
    db.variablePayEvaluation.findMany({
      where: { employeeId: { in: ids }, NOT: { periodYear: year, periodMonth: month } },
      include: { tasks: { orderBy: { sl: "asc" } } },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    }),
  ]);
  const evalByEmployee = new Map(evaluations.map((e) => [e.employeeId, e]));
  const lastTasks = new Map<string, string[]>();
  for (const p of previous) if (!lastTasks.has(p.employeeId)) lastTasks.set(p.employeeId, p.tasks.map((t) => t.task));

  const today = todayBd();
  const rows: VpRow[] = [];
  for (const e of employees) {
    const ev = evalByEmployee.get(e.id);
    if (!ev && !e.variablePayEligible) continue;
    if (ev && !VP_EDITABLE.includes(ev.status)) {
      rows.push(rowFromEvaluation(ev));
      continue;
    }
    const service = e.dateOfJoining ? serviceLength(e.dateOfJoining, today) : null;
    const live = {
      empCode: e.employeeId,
      name: e.fullName,
      doj: iso(e.dateOfJoining),
      days: service?.days ?? null,
      tenure: service?.tenure ?? null,
      designation: e.designation,
      department: e.department?.name ?? null,
      supervisor: e.supervisorName ?? headName,
    };
    if (ev) rows.push({ ...rowFromEvaluation(ev), ...live });
    else
      rows.push({
        key: `new-${e.id}`, employeeId: e.id, evaluationId: null, status: VP_STATUS.NOT_STARTED, periodYear: year, periodMonth: month,
        businessUnit: e.businessUnit?.name ?? null, ...live,
        kpiScore: null, qualityOfWork: null, timelineOfDeliverables: null, stakeholderPeerReview: null, attendance: null, totalScore: null,
        remarks: "", hrNote: "", hrNoteMeta: null, returnReason: null, submittedAt: null, evaluatorName: null,
        decisionComment: null, decidedAt: null, decidedBy: null,
        paymentAmount: null, paymentReference: null, paymentNote: null, paymentConfirmedAt: null, paymentConfirmedBy: null,
        tasks: emptyTasks(lastTasks.get(e.id)), events: [],
      });
  }

  const roster: VpRosterRow[] = employees.map((e) => ({
    id: e.id, empCode: e.employeeId, name: e.fullName, designation: e.designation, eligible: e.variablePayEligible,
    doj: e.dateOfJoining ? e.dateOfJoining.toISOString().slice(0, 10) : "", supervisor: e.supervisorName ?? "",
  }));
  return { rows, roster };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Request list for the Super Admin / HR ("review") and for Finance ("finance").
 * Default is every request across all periods; filters narrow by Department, Business Unit, status and submission date (Bangladesh time).
 * Requests waiting for the viewer's action come first, then the most recent submissions.
 */
export async function requestList(mode: "review" | "finance", f: VpFilters): Promise<VpRow[]> {
  const allowed = mode === "review" ? VP_REVIEW_STATUSES : VP_FINANCE_STATUSES;
  const submittedAt: Prisma.DateTimeNullableFilter = {};
  if (DATE.test(f.from)) submittedAt.gte = new Date(`${f.from}T00:00:00+06:00`);
  if (DATE.test(f.to)) submittedAt.lte = new Date(`${f.to}T23:59:59.999+06:00`);
  const evaluations = await db.variablePayEvaluation.findMany({
    where: {
      status: (allowed as string[]).includes(f.status) ? f.status : { in: allowed },
      ...(f.dept ? { departmentId: f.dept } : {}),
      ...(f.bu ? { employee: { businessUnitId: f.bu } } : {}),
      ...(Object.keys(submittedAt).length ? { submittedAt } : {}),
    },
    include,
    orderBy: { submittedAt: "desc" },
    take: 500,
  });
  const first = mode === "review" ? VP_STATUS.SUBMITTED : VP_STATUS.APPROVED;
  return evaluations.map(rowFromEvaluation).sort((a, b) => Number(b.status === first) - Number(a.status === first));
}

export async function filterOptions(): Promise<{ departments: VpOption[]; businessUnits: VpOption[] }> {
  const [departments, businessUnits] = await Promise.all([
    db.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.businessUnit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { departments, businessUnits };
}

type ViewUser = { role: string; departmentId: string | null; department: { code: string } | null };

/** Resolve which view a request shows, from the user's access and the URL. Shared by the page and the export. */
export function resolveVpView(user: ViewUser, sp: Record<string, string | undefined>) {
  const scopes = vpScopes(user);
  const mode: VpMode | null = scopes.length ? ((scopes as string[]).includes(sp.scope ?? "") ? (sp.scope as VpMode) : scopes[0]) : null;
  const today = todayBd();
  const y = Number(sp.year);
  const m = Number(sp.month);
  return {
    scopes,
    mode,
    year: y >= 2000 && y <= 2100 ? y : today.getUTCFullYear(),
    month: m >= 1 && m <= 12 ? m : today.getUTCMonth() + 1,
    currentYear: today.getUTCFullYear(),
    filters: { dept: sp.dept ?? "", bu: sp.bu ?? "", status: sp.status ?? "", from: DATE.test(sp.from ?? "") ? sp.from! : "", to: DATE.test(sp.to ?? "") ? sp.to! : "" } satisfies VpFilters,
  };
}

/** Sidebar: is Variable Pay available to this user, and how many requests are waiting for them. */
export async function variablePayNav(user: ViewUser): Promise<{ show: boolean; badge: number }> {
  const scopes = vpScopes(user);
  if (!scopes.length) return { show: false, badge: 0 };
  const counts = await Promise.all([
    isVpApprover(user) ? db.variablePayEvaluation.count({ where: { status: VP_STATUS.SUBMITTED } }) : 0,
    scopes.includes("department") ? db.variablePayEvaluation.count({ where: { status: VP_STATUS.RETURNED, departmentId: user.departmentId } }) : 0,
    isFinanceMember(user) ? db.variablePayEvaluation.count({ where: { status: VP_STATUS.APPROVED } }) : 0,
  ]);
  return { show: true, badge: counts.reduce((a, b) => a + b, 0) };
}
