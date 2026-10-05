import type { Prisma, PrismaClient } from "@prisma/client";
import { ROLES, USER_STATUS } from "./constants";
import {
  VP_EDITABLE, VP_MANUAL_CRITERIA, VP_STATUS, VP_TASK_COUNT, VP_TASK_MAX, isFuturePeriod, isHrReviewer, isVpApprover, isVpFinance,
  serviceLength, todayBd, vpTotals,
  type VpManualKey,
} from "./variable-pay";

/**
 * Variable Pay rules. Every function takes the database client explicitly so the same code runs
 * inside a server action or inside a rolled-back transaction in tests. Authorisation is enforced here,
 * not in the UI. Every workflow step appends a VariablePayEvent (who, what, when, comment).
 */
type Client = PrismaClient | Prisma.TransactionClient;
export type VpActor = { id: string; role: string; fullName: string; departmentId: string | null; department: { code: string; name: string } | null };

export class VpError extends Error {
  constructor(message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function isHeadOf(actor: VpActor, employee: { departmentId: string | null; role: string }) {
  return actor.role === ROLES.DEPARTMENT_HEAD && !!actor.departmentId && employee.departmentId === actor.departmentId && employee.role === ROLES.EMPLOYEE;
}

function logEvent(c: Client, evaluationId: string, action: string, actorId: string, comment?: string | null) {
  return c.variablePayEvent.create({ data: { evaluationId, action, actorId, comment: comment?.trim() || null } });
}

/* ---------- Eligibility roster ---------- */

export async function setEligibility(c: Client, actor: VpActor, input: { employeeId: string; eligible: boolean; doj: string; supervisor: string }) {
  const employee = await c.user.findUnique({ where: { id: input.employeeId } });
  if (!employee || employee.status === USER_STATUS.DEACTIVATED) throw new VpError("Employee not found.");
  if (!isHeadOf(actor, employee)) throw new VpError("You can manage Variable Pay eligibility only for employees in your department.");

  const fields: Record<string, string> = {};
  let doj: Date | null = employee.dateOfJoining;
  if (input.doj.trim()) {
    const d = new Date(`${input.doj.trim()}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) fields.doj = "Enter a valid date of joining.";
    else if (d.getTime() > todayBd().getTime()) fields.doj = "Date of joining cannot be in the future.";
    else doj = d;
  } else if (input.eligible) {
    fields.doj = "Date of joining is required for an eligible employee.";
  }
  const supervisor = input.supervisor.trim();
  if (input.eligible && supervisor.length < 2) fields.supervisor = "Supervisor is required for an eligible employee.";
  if (supervisor.length > 120) fields.supervisor = "Supervisor name is too long.";
  if (Object.keys(fields).length) throw new VpError("Please correct the highlighted fields.", fields);

  return c.user.update({
    where: { id: employee.id },
    data: { variablePayEligible: input.eligible, dateOfJoining: doj, supervisorName: supervisor || employee.supervisorName },
  });
}

/* ---------- Department Head: save draft / submit ---------- */

export type VpEvaluationInput = {
  employeeId: string;
  year: number;
  month: number;
  tasks: { task: string; score: unknown; remarks: string }[];
  scores: Record<VpManualKey, unknown>;
  remarks: string;
};

export async function saveEvaluation(c: Client, actor: VpActor, input: VpEvaluationInput, intent: "draft" | "submit") {
  const submit = intent === "submit";
  if (!(input.month >= 1 && input.month <= 12) || !(input.year >= 2000 && input.year <= 2100)) throw new VpError("Choose a valid month.");
  if (isFuturePeriod(input.year, input.month)) throw new VpError("A future month cannot be evaluated yet.");

  const employee = await c.user.findUnique({ where: { id: input.employeeId }, include: { department: true } });
  if (!employee) throw new VpError("Employee not found.");
  if (!isHeadOf(actor, employee)) throw new VpError("You can evaluate only employees in your department.");

  const existing = await c.variablePayEvaluation.findUnique({
    where: { employeeId_periodYear_periodMonth: { employeeId: employee.id, periodYear: input.year, periodMonth: input.month } },
  });
  if (existing && !VP_EDITABLE.includes(existing.status)) {
    throw new VpError(
      existing.status === VP_STATUS.SUBMITTED
        ? "This request is submitted and waiting for the Super Admin. It can be changed only if it is returned."
        : "This request is closed and can no longer be changed.",
    );
  }
  if (!existing && !employee.variablePayEligible) throw new VpError("This employee is not on the Variable Pay eligibility list.");

  const fields: Record<string, string> = {};
  if (input.tasks.length !== VP_TASK_COUNT) throw new VpError(`Exactly ${VP_TASK_COUNT} major tasks are required.`);
  const tasks = input.tasks.map((t, i) => {
    const sl = i + 1;
    const task = t.task.trim();
    const score = num(t.score);
    if (task.length > 500) fields[`task_${sl}`] = "Keep the task under 500 characters.";
    else if (submit && task.length < 3) fields[`task_${sl}`] = "Describe the task.";
    if (score !== null && (Number.isNaN(score) || score < 0 || score > VP_TASK_MAX)) fields[`score_${sl}`] = `Enter a score from 0 to ${VP_TASK_MAX}.`;
    else if (submit && score === null) fields[`score_${sl}`] = "Score is required.";
    return { sl, task, score: score === null || Number.isNaN(score) ? null : round2(score), remarks: t.remarks.trim().slice(0, 1000) };
  });
  const manual = {} as Record<VpManualKey, number | null>;
  for (const crit of VP_MANUAL_CRITERIA) {
    const v = num(input.scores[crit.key]);
    if (v !== null && (Number.isNaN(v) || v < 0 || v > crit.max)) fields[crit.key] = `Enter a score from 0 to ${crit.max}.`;
    else if (submit && v === null) fields[crit.key] = "Score is required.";
    manual[crit.key] = v === null || Number.isNaN(v) ? null : round2(v);
  }
  const remarks = input.remarks.trim();
  if (remarks.length > 2000) fields.remarks = "Keep remarks under 2,000 characters.";
  if (submit && !employee.dateOfJoining) fields.form = "Add this employee's date of joining in Eligible employees before submitting.";
  if (Object.keys(fields).length) throw new VpError(fields.form ?? "Please correct the highlighted fields.", fields);

  const { kpiScore, totalScore } = vpTotals(tasks.map((t) => t.score), manual);
  const service = employee.dateOfJoining ? serviceLength(employee.dateOfJoining, todayBd()) : null;
  const data = {
    evaluatorId: actor.id,
    status: submit ? VP_STATUS.SUBMITTED : existing?.status === VP_STATUS.RETURNED ? VP_STATUS.RETURNED : VP_STATUS.DRAFT,
    empCode: employee.employeeId,
    empName: employee.fullName,
    doj: employee.dateOfJoining,
    days: service?.days ?? null,
    tenure: service?.tenure ?? null,
    designation: employee.designation,
    departmentName: employee.department?.name ?? null,
    departmentId: employee.departmentId,
    supervisor: employee.supervisorName ?? actor.fullName,
    kpiScore,
    ...manual,
    totalScore,
    remarks: remarks || null,
    // A (re)submission starts a fresh review: the exact time is recorded and the previous decision is cleared (it stays in the history).
    ...(submit ? { submittedAt: new Date(), returnReason: null, decisionComment: null, decidedAt: null, decidedById: null } : {}),
  };
  const saved = existing
    ? await c.variablePayEvaluation.update({ where: { id: existing.id }, data })
    : await c.variablePayEvaluation.create({ data: { ...data, employeeId: employee.id, periodYear: input.year, periodMonth: input.month } });
  await c.variablePayTask.deleteMany({ where: { evaluationId: saved.id } });
  await c.variablePayTask.createMany({ data: tasks.map((t) => ({ evaluationId: saved.id, sl: t.sl, task: t.task, score: t.score, remarks: t.remarks || null })) });
  if (submit) await logEvent(c, saved.id, existing?.submittedAt ? "RESUBMITTED" : "SUBMITTED", actor.id, `Total Score ${totalScore}`);
  return saved;
}

/* ---------- Super Admin: approve / return / reject ---------- */

export type VpDecision = "approve" | "return" | "reject";

export async function decideEvaluation(c: Client, actor: VpActor, input: { evaluationId: string; decision: VpDecision; comment: string }) {
  if (!isVpApprover(actor)) throw new VpError("Only the Super Admin can approve, return or reject a Variable Pay request.");
  const ev = await c.variablePayEvaluation.findUnique({ where: { id: input.evaluationId } });
  if (!ev) throw new VpError("Request not found.");
  if (ev.status !== VP_STATUS.SUBMITTED) throw new VpError("Only a submitted request can be decided. This one has already been handled.");

  const comment = input.comment.trim();
  if (comment.length > 2000) throw new VpError("Please correct the highlighted fields.", { comment: "Keep the comment under 2,000 characters." });
  if (input.decision !== "approve" && comment.length < 5) {
    throw new VpError("Please correct the highlighted fields.", {
      comment: input.decision === "return" ? "Tell the Department Head what needs to be corrected." : "A reason is required to reject a request.",
    });
  }
  const status = input.decision === "approve" ? VP_STATUS.APPROVED : input.decision === "return" ? VP_STATUS.RETURNED : VP_STATUS.REJECTED;
  const updated = await c.variablePayEvaluation.update({
    where: { id: ev.id },
    data: { status, decidedById: actor.id, decidedAt: new Date(), decisionComment: comment || null, returnReason: input.decision === "return" ? comment : null },
  });
  await logEvent(c, ev.id, status, actor.id, comment);
  return updated;
}

/* ---------- HR Note ---------- */

export async function setHrNote(c: Client, actor: VpActor, input: { evaluationId: string; note: string }) {
  if (!isHrReviewer(actor)) throw new VpError("Only HR can write the HR Note.");
  const ev = await c.variablePayEvaluation.findUnique({ where: { id: input.evaluationId } });
  if (!ev) throw new VpError("Request not found.");
  if (ev.status !== VP_STATUS.SUBMITTED && ev.status !== VP_STATUS.APPROVED) throw new VpError("The HR Note can be written only while a request is submitted or approved.");
  const note = input.note.trim();
  if (note.length > 2000) throw new VpError("Please correct the highlighted fields.", { hrNote: "Keep the HR note under 2,000 characters." });
  const updated = await c.variablePayEvaluation.update({ where: { id: ev.id }, data: { hrNote: note || null, hrNoteById: actor.id, hrNoteAt: new Date() } });
  await logEvent(c, ev.id, "HR_NOTE", actor.id, note);
  return updated;
}

/* ---------- Finance: confirm the payment amount ---------- */

export async function confirmPayment(c: Client, actor: VpActor, input: { evaluationId: string; amount: unknown; reference: string; note: string }) {
  if (!isVpFinance(actor)) throw new VpError("Only a Finance Admin or the Super Admin can confirm a Variable Pay payment.");
  const ev = await c.variablePayEvaluation.findUnique({ where: { id: input.evaluationId } });
  if (!ev) throw new VpError("Request not found.");
  if (ev.status === VP_STATUS.PAYMENT_CONFIRMED) throw new VpError("Payment is already confirmed for this request.");
  if (ev.status !== VP_STATUS.APPROVED) throw new VpError("Payment can be confirmed only for a request approved by the Super Admin.");
  // Nobody confirms their own Variable Pay, and whoever prepared a request never confirms its payment.
  // The Super Admin has full authority over the workflow, so having approved a request does not stop them confirming its payment.
  if (ev.employeeId === actor.id || ev.evaluatorId === actor.id) throw new VpError("You prepared or are the subject of this request, so someone else must confirm its payment.");
  if (ev.decidedById === actor.id && actor.role !== "SUPER_ADMIN") throw new VpError("You approved this request, so another Finance Admin must confirm its payment.");

  const fields: Record<string, string> = {};
  const amount = num(input.amount);
  if (amount === null) fields.amount = "Enter the payment amount.";
  else if (Number.isNaN(amount) || amount <= 0) fields.amount = "The payment amount must be greater than zero.";
  else if (amount > 100_000_000) fields.amount = "The payment amount is too large.";
  const reference = input.reference.trim();
  const note = input.note.trim();
  if (reference.length > 120) fields.reference = "Keep the reference under 120 characters.";
  if (note.length > 1000) fields.note = "Keep the note under 1,000 characters.";
  if (Object.keys(fields).length) throw new VpError("Please correct the highlighted fields.", fields);

  const paid = round2(amount as number);
  const updated = await c.variablePayEvaluation.update({
    where: { id: ev.id },
    data: { status: VP_STATUS.PAYMENT_CONFIRMED, paymentAmount: paid, paymentReference: reference || null, paymentNote: note || null, paymentConfirmedById: actor.id, paymentConfirmedAt: new Date() },
  });
  await logEvent(c, ev.id, VP_STATUS.PAYMENT_CONFIRMED, actor.id, `Amount ${paid.toLocaleString("en-US", { minimumFractionDigits: 2 })} BDT${reference ? ` · Ref ${reference}` : ""}${note ? ` · ${note}` : ""}`);
  return updated;
}
