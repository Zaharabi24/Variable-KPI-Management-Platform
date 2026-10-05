import type { Kpi, KpiTask, Prisma, PrismaClient } from "@prisma/client";
import { ROLES, USER_STATUS } from "./constants";
import {
  DEPT_CRITERIA, KPI_STATUS, KPI_TASK_COUNT, KPI_TASK_MAX, STAGE_LABELS, canActOn, isFuturePeriod, kpiTitle, ownsKpis, round2, stageOf, sumTasks, totalScore,
  type KpiStage,
} from "./kpi";
import { diffKpi, flatKpi, snapshotOf } from "./versions";

/**
 * KPI workflow — every state change of a score sheet goes through here, inside the caller's transaction.
 * Each function re-checks who may act, validates the input, writes the change and appends one row to the
 * version history (what changed) and one to the decision history (who decided what, and why).
 */

export type Client = PrismaClient | Prisma.TransactionClient;
export type Actor = { id: string; role: string; departmentId: string | null };
export type KpiFull = Kpi & { tasks: KpiTask[] };

export class KpiError extends Error {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.fields = fields;
  }
}

const FIX = "Please correct the highlighted fields.";

/** "" / null / undefined -> null; anything unparsable -> NaN, so callers can tell "blank" from "wrong". */
function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
const bad = (n: number | null, max: number) => n !== null && (Number.isNaN(n) || n < 0 || n > max);

const withTasks = { tasks: { orderBy: { sl: "asc" as const } } };

/** Approval Person list: an employee's Department Heads; a Department Head's own KPI goes to the Super Admin. */
export function approverOptions(c: Client, actor: Actor) {
  if (actor.role === ROLES.DEPARTMENT_HEAD) {
    return c.user.findMany({ where: { role: ROLES.SUPER_ADMIN, status: USER_STATUS.ACTIVE }, orderBy: { fullName: "asc" } });
  }
  if (!actor.departmentId) return Promise.resolve([]);
  return c.user.findMany({
    where: { role: ROLES.DEPARTMENT_HEAD, departmentId: actor.departmentId, status: USER_STATUS.ACTIVE, NOT: { id: actor.id } },
    orderBy: { fullName: "asc" },
  });
}

/** Writes the change, bumps the version and records both histories. */
async function commit(
  c: Client,
  before: KpiFull,
  data: Prisma.KpiUncheckedUpdateInput,
  log: { action: string; stage: KpiStage; actorId: string; reason?: string | null; extraChanges?: { field: string; oldValue: null; newValue: string }[] },
): Promise<KpiFull> {
  const after = await c.kpi.update({ where: { id: before.id }, data: { ...data, currentVersion: before.currentVersion + 1 }, include: withTasks });
  const changes = [...diffKpi(flatKpi(before), flatKpi(after)), ...(log.extraChanges ?? [])];
  await c.kpiVersion.create({
    data: { kpiId: after.id, versionNo: after.currentVersion, action: log.action, snapshot: snapshotOf(after), changes: JSON.stringify(changes), reason: log.reason ?? null, changedById: log.actorId },
  });
  await c.reviewDecision.create({ data: { kpiId: after.id, reviewerId: log.actorId, stage: log.stage, decision: log.action, reason: log.reason ?? null } });
  return after;
}

/* ---------- Employee: create, save as draft, submit, correct and resubmit ---------- */

export type TaskInput = { task: string; score: unknown; remarks: string };
export type SheetInput = { kpiId?: string | null; year: number; month: number; tasks: TaskInput[]; remarks: string; approverId: string };

export async function saveSheet(c: Client, actor: Actor, input: SheetInput, intent: "draft" | "submit", evidenceFileName?: string | null): Promise<KpiFull> {
  if (!ownsKpis(actor)) throw new KpiError("Only Employees and Department Heads submit KPIs.");
  const submit = intent === "submit";

  const existing = input.kpiId ? await c.kpi.findUnique({ where: { id: input.kpiId }, include: withTasks }) : null;
  if (input.kpiId && (!existing || existing.ownerId !== actor.id || existing.deletedAt)) throw new KpiError("KPI not found.");
  if (existing && existing.status !== KPI_STATUS.DRAFT && existing.status !== KPI_STATUS.RETURNED) {
    throw new KpiError("This KPI has been submitted and can no longer be changed.");
  }
  const returned = existing?.status === KPI_STATUS.RETURNED;

  const fields: Record<string, string> = {};
  // A returned KPI keeps its month; only its content is corrected.
  const year = returned ? existing!.periodYear : input.year;
  const month = returned ? existing!.periodMonth : input.month;
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) fields.period = "Choose the KPI month and year.";
  else if (isFuturePeriod(year, month)) fields.period = "A KPI cannot be created for a month that has not started.";
  else {
    const clash = await c.kpi.findFirst({
      where: { ownerId: actor.id, periodYear: year, periodMonth: month, deletedAt: null, status: { not: KPI_STATUS.REJECTED }, ...(existing ? { NOT: { id: existing.id } } : {}) },
      select: { id: true },
    });
    if (clash) fields.period = `You already have a KPI for ${kpiTitle({ periodYear: year, periodMonth: month })}. Open it from My KPI.`;
  }

  if (input.tasks.length !== KPI_TASK_COUNT) throw new KpiError(`A KPI has exactly ${KPI_TASK_COUNT} major tasks.`);
  const tasks = input.tasks.map((t, i) => {
    const sl = i + 1;
    const task = t.task.trim();
    const score = num(t.score);
    const remarks = t.remarks.trim();
    if (task.length > 200) fields[`task_${sl}`] = "Keep the task under 200 characters.";
    else if (submit && task.length < 2) fields[`task_${sl}`] = "Enter the task.";
    if (bad(score, KPI_TASK_MAX)) fields[`score_${sl}`] = `Enter a score from 0 to ${KPI_TASK_MAX}.`;
    else if (submit && score === null) fields[`score_${sl}`] = "Score is required.";
    if (remarks.length > 500) fields[`tremarks_${sl}`] = "Keep remarks under 500 characters.";
    return { sl, task, score: score === null || Number.isNaN(score) ? null : round2(score), remarks };
  });
  if (!submit && !tasks.some((t) => t.task || t.score !== null)) fields.task_1 = "Enter at least one task to save a draft.";

  const remarks = input.remarks.trim();
  if (remarks.length > 2000) fields.remarks = "Keep remarks under 2,000 characters.";

  const approverId = input.approverId.trim();
  if (submit && !approverId) fields.approverId = "Select an Approval Person.";
  if (approverId) {
    const approvers = await approverOptions(c, actor);
    if (!approvers.some((a) => a.id === approverId)) {
      fields.approverId = actor.role === ROLES.DEPARTMENT_HEAD ? "A Department Head's KPI is approved by the Super Admin." : "The Approval Person must be a Department Head of your department.";
    }
  }
  if (Object.keys(fields).length) throw new KpiError(submit ? `${FIX} Nothing was submitted.` : FIX, fields);

  const selfScore = sumTasks(tasks.map((t) => t.score));
  const base = { periodYear: year, periodMonth: month, remarks, approverId: approverId || null, selfScore };

  const writeTasks = async (kpiId: string) => {
    for (const t of tasks) {
      const data = { task: t.task, score: t.score, employeeScore: t.score, remarks: t.remarks };
      await c.kpiTask.upsert({ where: { kpiId_sl: { kpiId, sl: t.sl } }, update: data, create: { kpiId, sl: t.sl, ...data } });
    }
  };

  if (!submit) {
    const kpi = existing
      ? await c.kpi.update({ where: { id: existing.id }, data: base })
      : await c.kpi.create({ data: { ...base, status: KPI_STATUS.DRAFT, ownerId: actor.id } });
    await writeTasks(kpi.id);
    return c.kpi.findUniqueOrThrow({ where: { id: kpi.id }, include: withTasks });
  }

  // Submit: a new sheet starts at version 0 so the first submission becomes version 1.
  const draft = existing ?? (await c.kpi.create({ data: { ...base, status: KPI_STATUS.DRAFT, ownerId: actor.id }, include: withTasks }));
  await writeTasks(draft.id);
  return commit(
    c,
    draft,
    {
      ...base, status: KPI_STATUS.SUBMITTED, submittedAt: new Date(), returnRemarks: null, decisionReason: null,
      // A corrected KPI is reviewed afresh: the Department Head confirms the breakdown again.
      kpiScore: null, adjusted: false, adjustReason: null, totalScore: null,
    },
    { action: returned ? "RESUBMIT" : "SUBMIT", stage: "EMPLOYEE", actorId: actor.id, extraChanges: evidenceFileName ? [{ field: "evidence", oldValue: null, newValue: evidenceFileName }] : [] },
  );
}

/* ---------- Loading a KPI for a decision ---------- */

async function loadFor(c: Client, actor: Actor, kpiId: string, stage: Exclude<KpiStage, "EMPLOYEE">) {
  const kpi = await c.kpi.findUnique({ where: { id: kpiId }, include: { ...withTasks, owner: { select: { id: true, fullName: true, email: true, departmentId: true, role: true } } } });
  if (!kpi || kpi.deletedAt) throw new KpiError("KPI request not found.");
  if (stageOf(kpi.status) !== stage) throw new KpiError(`This KPI is not waiting for the ${STAGE_LABELS[stage]} any more. Refresh the page to see where it is.`);
  if (!canActOn(actor, kpi)) throw new KpiError(kpi.ownerId === actor.id ? "You cannot review your own KPI." : "You are not allowed to act on this KPI request.");
  return kpi;
}

function reasonOf(v: string, what: string): string {
  const reason = v.trim();
  if (reason.length < 5) throw new KpiError(FIX, { reason: `${what} (at least 5 characters).` });
  if (reason.length > 2000) throw new KpiError(FIX, { reason: "Keep this under 2,000 characters." });
  return reason;
}

function noteOf(v: string): string | null {
  const note = v.trim();
  if (note.length > 2000) throw new KpiError(FIX, { note: "Keep the note under 2,000 characters." });
  return note || null;
}

/* ---------- Department Head ---------- */

export type DeptDecision = "approve" | "adjust" | "return" | "reject";
export type DeptInput = {
  kpiId: string; decision: DeptDecision; tasks: TaskInput[];
  qualityOfWork: unknown; timelineOfDeliverables: unknown; stakeholderPeerReview: unknown; reason: string;
};

export async function deptDecide(c: Client, actor: Actor, input: DeptInput): Promise<KpiFull> {
  const kpi = await loadFor(c, actor, input.kpiId, "DEPT");
  const now = new Date();

  if (input.decision === "return") {
    const reason = reasonOf(input.reason, "Remarks are required to return a KPI");
    return commit(c, kpi, { status: KPI_STATUS.RETURNED, returnRemarks: reason, deptDecidedAt: now, deptDecidedById: actor.id }, { action: "DEPT_RETURN", stage: "DEPT", actorId: actor.id, reason });
  }
  if (input.decision === "reject") {
    const reason = reasonOf(input.reason, "A reason is required to reject a KPI");
    return commit(c, kpi, { status: KPI_STATUS.REJECTED, decisionReason: reason, returnRemarks: null, totalScore: null, deptDecidedAt: now, deptDecidedById: actor.id }, { action: "DEPT_REJECT", stage: "DEPT", actorId: actor.id, reason });
  }

  if (input.tasks.length !== KPI_TASK_COUNT) throw new KpiError(`A KPI has exactly ${KPI_TASK_COUNT} major tasks.`);
  const fields: Record<string, string> = {};
  let changed = false;
  const tasks = input.tasks.map((t, i) => {
    const sl = i + 1;
    const stored = kpi.tasks.find((x) => x.sl === sl);
    const task = t.task.trim();
    const score = num(t.score);
    const remarks = t.remarks.trim();
    if (task.length < 2) fields[`task_${sl}`] = "Enter the task.";
    else if (task.length > 200) fields[`task_${sl}`] = "Keep the task under 200 characters.";
    if (score === null) fields[`score_${sl}`] = "Score is required.";
    else if (bad(score, KPI_TASK_MAX)) fields[`score_${sl}`] = `Enter a score from 0 to ${KPI_TASK_MAX}.`;
    if (remarks.length > 500) fields[`tremarks_${sl}`] = "Keep remarks under 500 characters.";
    const value = score === null || Number.isNaN(score) ? null : round2(score);
    // "Changed" is measured against what the employee submitted, so an adjustment stays an adjustment on every later pass.
    if (task !== (stored?.task ?? "") || value !== (stored?.employeeScore ?? null)) changed = true;
    return { sl, task, score: value, remarks };
  });
  const criteria = {} as Record<(typeof DEPT_CRITERIA)[number]["key"], number>;
  for (const crit of DEPT_CRITERIA) {
    const v = num(input[crit.key]);
    if (v === null) fields[crit.key] = "Score is required.";
    else if (bad(v, crit.max)) fields[crit.key] = `Enter a score from 0 to ${crit.max}.`;
    else criteria[crit.key] = round2(v);
  }
  if (Object.keys(fields).length) throw new KpiError(`${FIX} Nothing was approved.`, fields);

  const adjust = input.decision === "adjust";
  if (changed && !adjust) throw new KpiError("You changed the employee's score breakdown. Use Apply Adjustment and give a reason.");
  if (!changed && adjust) throw new KpiError("Nothing in the employee's score breakdown was changed. Use Approve instead.");
  // Remarks are optional on every approval, including an adjustment; the changed scores are recorded either way.
  const reason = adjust ? noteOf(input.reason) : null;

  for (const t of tasks) await c.kpiTask.update({ where: { kpiId_sl: { kpiId: kpi.id, sl: t.sl } }, data: { task: t.task, score: t.score, remarks: t.remarks } });
  return commit(
    c,
    kpi,
    {
      ...criteria, kpiScore: sumTasks(tasks.map((t) => t.score)), status: KPI_STATUS.DEPT_APPROVED, adjusted: adjust, adjustReason: reason,
      returnRemarks: null, totalScore: null, deptDecidedAt: now, deptDecidedById: actor.id,
    },
    { action: adjust ? "DEPT_ADJUST" : "DEPT_APPROVE", stage: "DEPT", actorId: actor.id, reason },
  );
}

/* ---------- HR Admin ---------- */

export type HrInput = { kpiId: string; decision: "approve" | "return"; attendance: unknown; hrRemarks: string; hrNote: string; paymentAmount: unknown; reason: string };

export async function hrDecide(c: Client, actor: Actor, input: HrInput): Promise<KpiFull> {
  const kpi = await loadFor(c, actor, input.kpiId, "HR");
  const now = new Date();

  if (input.decision === "return") {
    const reason = reasonOf(input.reason, "Remarks are required to return a KPI to the Department Head");
    return commit(c, kpi, { status: KPI_STATUS.RETURNED_TO_HEAD, returnRemarks: reason, totalScore: null, hrDecidedAt: now, hrDecidedById: actor.id }, { action: "HR_RETURN", stage: "HR", actorId: actor.id, reason });
  }

  const fields: Record<string, string> = {};
  const attendance = num(input.attendance);
  if (attendance === null) fields.attendance = "Attendance is required.";
  else if (bad(attendance, 10)) fields.attendance = "Enter a score from 0 to 10.";
  const payment = num(input.paymentAmount);
  if (payment === null) fields.paymentAmount = "Enter the payment amount.";
  else if (Number.isNaN(payment) || payment < 0) fields.paymentAmount = "The payment amount cannot be negative.";
  else if (payment > 100_000_000) fields.paymentAmount = "The payment amount is too large.";
  const hrRemarks = input.hrRemarks.trim();
  const hrNote = input.hrNote.trim();
  if (hrRemarks.length > 2000) fields.hrRemarks = "Keep remarks under 2,000 characters.";
  if (hrNote.length > 2000) fields.hrNote = "Keep the HR Note under 2,000 characters.";
  if (Object.keys(fields).length) throw new KpiError(`${FIX} Nothing was approved.`, fields);

  const att = round2(attendance as number);
  const total = totalScore({ kpiScore: kpi.kpiScore, qualityOfWork: kpi.qualityOfWork, timelineOfDeliverables: kpi.timelineOfDeliverables, stakeholderPeerReview: kpi.stakeholderPeerReview, attendance: att });
  if (total === null) throw new KpiError("The Department Head's scores are incomplete. Return this KPI to the Department Head.");
  return commit(
    c,
    kpi,
    { attendance: att, hrRemarks: hrRemarks || null, hrNote: hrNote || null, paymentAmount: round2(payment as number), totalScore: total, status: KPI_STATUS.HR_APPROVED, returnRemarks: null, hrDecidedAt: now, hrDecidedById: actor.id },
    { action: "HR_APPROVE", stage: "HR", actorId: actor.id },
  );
}

/* ---------- Finance Admin and Audit Admin ---------- */

export type StageInput = { kpiId: string; decision: "approve" | "return"; note: string; reason: string };

export async function financeDecide(c: Client, actor: Actor, input: StageInput): Promise<KpiFull> {
  const kpi = await loadFor(c, actor, input.kpiId, "FINANCE");
  const now = new Date();
  if (input.decision === "return") {
    const reason = reasonOf(input.reason, "Remarks are required to reject and return a KPI to the HR Admin");
    return commit(c, kpi, { status: KPI_STATUS.RETURNED_TO_HR, returnRemarks: reason, financeDecidedAt: now, financeDecidedById: actor.id }, { action: "FINANCE_RETURN", stage: "FINANCE", actorId: actor.id, reason });
  }
  const note = noteOf(input.note);
  return commit(c, kpi, { status: KPI_STATUS.FINANCE_APPROVED, financeNote: note, returnRemarks: null, financeDecidedAt: now, financeDecidedById: actor.id }, { action: "FINANCE_APPROVE", stage: "FINANCE", actorId: actor.id, reason: note });
}

export async function auditDecide(c: Client, actor: Actor, input: StageInput): Promise<KpiFull> {
  const kpi = await loadFor(c, actor, input.kpiId, "AUDIT");
  const now = new Date();
  if (input.decision === "return") {
    const reason = reasonOf(input.reason, "Remarks are required to return a KPI to the Finance Admin");
    return commit(c, kpi, { status: KPI_STATUS.RETURNED_TO_FINANCE, returnRemarks: reason, auditDecidedAt: now, auditDecidedById: actor.id }, { action: "AUDIT_RETURN", stage: "AUDIT", actorId: actor.id, reason });
  }
  const note = noteOf(input.note);
  return commit(c, kpi, { status: KPI_STATUS.COMPLETED, auditNote: note, returnRemarks: null, auditDecidedAt: now, auditDecidedById: actor.id }, { action: "AUDIT_APPROVE", stage: "AUDIT", actorId: actor.id, reason: note });
}

/* ---------- Delete (kept in version history) ---------- */

export async function deleteKpi(c: Client, actor: Actor, kpiId: string, reasonRaw: string): Promise<KpiFull> {
  const reason = reasonOf(reasonRaw, "A reason is required to delete a KPI");
  const kpi = await c.kpi.findUnique({ where: { id: kpiId }, include: { ...withTasks, owner: { select: { departmentId: true, role: true } } } });
  if (!kpi || kpi.deletedAt) throw new KpiError("KPI not found.");
  // The Super Admin can remove any record; a Department Head only one that is waiting for them.
  const allowed = actor.role === ROLES.SUPER_ADMIN || (stageOf(kpi.status) === "DEPT" && canActOn(actor, kpi));
  if (!allowed) throw new KpiError("You are not allowed to delete this KPI.");
  return commit(c, kpi, { deletedAt: new Date(), deleteReason: reason }, { action: "DELETE", stage: stageOf(kpi.status) ?? "AUDIT", actorId: actor.id, reason });
}
