import { db } from "./db";
import { ROLES, USER_STATUS } from "./constants";
import { fmtDateTime } from "./utils";
import { VP_STATUS, VP_TASK_COUNT, serviceLength, todayBd, type VpRosterRow, type VpRow, type VpStatus, type VpTaskRow } from "./variable-pay";

type EvalWithTasks = Awaited<ReturnType<typeof loadEvaluations>>[number];

function loadEvaluations(where: object) {
  return db.variablePayEvaluation.findMany({
    where,
    include: { tasks: { orderBy: { sl: "asc" } }, evaluator: { select: { fullName: true } }, hrNoteBy: { select: { fullName: true } } },
    orderBy: [{ departmentName: "asc" }, { empName: "asc" }],
  });
}

function emptyTasks(seed: string[] = []): VpTaskRow[] {
  return Array.from({ length: VP_TASK_COUNT }, (_, i) => ({ sl: i + 1, task: seed[i] ?? "", score: null, remarks: "" }));
}

function tasksOf(ev: EvalWithTasks): VpTaskRow[] {
  const bySl = new Map(ev.tasks.map((t) => [t.sl, t]));
  return emptyTasks().map((t) => {
    const s = bySl.get(t.sl);
    return s ? { sl: t.sl, task: s.task, score: s.score, remarks: s.remarks ?? "" } : t;
  });
}

function rowFromEvaluation(ev: EvalWithTasks): VpRow {
  return {
    employeeId: ev.employeeId,
    evaluationId: ev.id,
    status: ev.status as VpStatus,
    empCode: ev.empCode,
    name: ev.empName,
    doj: ev.doj ? ev.doj.toISOString() : null,
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
    hrNoteMeta: ev.hrNoteAt ? `${ev.hrNoteBy?.fullName ?? "HR"} · ${fmtDateTime(ev.hrNoteAt)}` : null,
    returnReason: ev.returnReason,
    submittedAt: ev.submittedAt ? ev.submittedAt.toISOString() : null,
    evaluatorName: ev.evaluator.fullName,
    tasks: tasksOf(ev),
  };
}

/**
 * Department Head view: every eligible employee in the department for the month, with their evaluation if one exists.
 * Until an evaluation is submitted the employee columns are live (DOJ, Days and Tenure as of today); once submitted they are the stored snapshot.
 * A new evaluation is pre-filled with the task names from the employee's most recent evaluation.
 */
export async function departmentSheet(departmentId: string, headName: string, year: number, month: number): Promise<{ rows: VpRow[]; roster: VpRosterRow[] }> {
  const employees = await db.user.findMany({
    where: { departmentId, role: ROLES.EMPLOYEE, status: { not: USER_STATUS.DEACTIVATED } },
    include: { department: true },
    orderBy: { fullName: "asc" },
  });
  const ids = employees.map((e) => e.id);
  const [evaluations, previous] = await Promise.all([
    loadEvaluations({ employeeId: { in: ids }, periodYear: year, periodMonth: month }),
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
    if (ev && ev.status === VP_STATUS.SUBMITTED) {
      rows.push(rowFromEvaluation(ev));
      continue;
    }
    const service = e.dateOfJoining ? serviceLength(e.dateOfJoining, today) : null;
    const live = {
      empCode: e.employeeId,
      name: e.fullName,
      doj: e.dateOfJoining ? e.dateOfJoining.toISOString() : null,
      days: service?.days ?? null,
      tenure: service?.tenure ?? null,
      designation: e.designation,
      department: e.department?.name ?? null,
      supervisor: e.supervisorName ?? headName,
    };
    if (ev) rows.push({ ...rowFromEvaluation(ev), ...live });
    else
      rows.push({
        employeeId: e.id, evaluationId: null, status: VP_STATUS.NOT_STARTED, ...live,
        kpiScore: null, qualityOfWork: null, timelineOfDeliverables: null, stakeholderPeerReview: null, attendance: null, totalScore: null,
        remarks: "", hrNote: "", hrNoteMeta: null, returnReason: null, submittedAt: null, evaluatorName: null,
        tasks: emptyTasks(lastTasks.get(e.id)),
      });
  }

  const roster: VpRosterRow[] = employees.map((e) => ({
    id: e.id, empCode: e.employeeId, name: e.fullName, designation: e.designation, eligible: e.variablePayEligible,
    doj: e.dateOfJoining ? e.dateOfJoining.toISOString().slice(0, 10) : "", supervisor: e.supervisorName ?? "",
  }));
  return { rows, roster };
}

/** HR view: submitted and returned evaluations of every department for the month (drafts stay private to the Department Head). */
export async function hrSheet(year: number, month: number): Promise<VpRow[]> {
  const evaluations = await loadEvaluations({ periodYear: year, periodMonth: month, status: { in: [VP_STATUS.SUBMITTED, VP_STATUS.RETURNED] } });
  return evaluations.map(rowFromEvaluation);
}
