"use server";

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { KPI_TASK_COUNT, kpiTitle } from "@/lib/kpi";
import { KpiError, auditDecide, deleteKpi, deptDecide, financeDecide, hrDecide, type DeptDecision, type KpiFull, type TaskInput } from "@/lib/kpi-service";
import { notifyKpi } from "@/lib/kpi-notify";
import { revalidateKpi } from "@/lib/kpi-revalidate";
import { invalid, type ActionState } from "./form";

/**
 * The four reviewing stages of the approval chain. Each action runs its decision in one transaction
 * (lib/kpi-service.ts re-checks who may act), then records the audit entry and notifies whoever is next.
 */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const TX = { timeout: 20000, maxWait: 10000 };

function fail(formData: FormData, e: unknown): ActionState {
  if (e instanceof KpiError) return invalid(formData, e.fields, e.message);
  console.error("[kpi-review]", e);
  return { ok: false, message: "Something went wrong. Nothing was saved. Please try again." };
}

const ownerOf = (kpi: KpiFull) => db.user.findUniqueOrThrow({ where: { id: kpi.ownerId }, select: { fullName: true, employeeId: true } });

/** Department Head: Approve, Apply Adjustment, Return to Employee or Reject. */
export async function deptDecideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const d = str(formData, "decision");
  const decision: DeptDecision = d === "adjust" || d === "return" || d === "reject" ? d : "approve";
  const tasks: TaskInput[] = Array.from({ length: KPI_TASK_COUNT }, (_, i) => ({ task: str(formData, `task_${i + 1}`), score: str(formData, `score_${i + 1}`), remarks: str(formData, `tremarks_${i + 1}`) }));
  try {
    const kpi = await db.$transaction(
      (tx) => deptDecide(tx, user, {
        kpiId: str(formData, "kpiId"), decision, tasks, reason: str(formData, "reason"),
        qualityOfWork: str(formData, "qualityOfWork"), timelineOfDeliverables: str(formData, "timelineOfDeliverables"), stakeholderPeerReview: str(formData, "stakeholderPeerReview"),
      }),
      TX,
    );
    const owner = await ownerOf(kpi);
    const title = kpiTitle(kpi);
    await audit(user.id, `KPI_DEPT_${decision.toUpperCase()}`, "Kpi", kpi.id, { period: title, kpiScore: kpi.kpiScore, reason: str(formData, "reason").trim() || null });
    if (decision === "return") {
      await notifyKpi("EMPLOYEE", kpi, owner.fullName, "KPI returned for correction", `Your KPI for ${title} was returned by ${user.fullName}.\n\nRemarks: ${kpi.returnRemarks}\n\nCorrect it and submit it again.`);
    } else if (decision === "reject") {
      await notifyKpi("EMPLOYEE", kpi, owner.fullName, "KPI rejected", `Your KPI for ${title} was rejected by ${user.fullName}.\n\nReason: ${kpi.decisionReason}`);
    } else {
      await notifyKpi("HR", kpi, owner.fullName, "KPI approved by the Department Head",
        `${user.fullName} approved the KPI of ${owner.fullName} (${owner.employeeId}) for ${title}${kpi.adjusted ? " with an adjustment" : ""}. KPI (5): ${kpi.kpiScore} of 50. Please add Attendance, Remarks, the HR Note and the Payment Amount.`);
    }
    revalidateKpi(kpi.id);
    const message = decision === "return" ? `Returned to ${owner.fullName} for correction.` : decision === "reject" ? `KPI of ${owner.fullName} rejected.` : `${decision === "adjust" ? "Adjusted and approved" : "Approved"}. The KPI of ${owner.fullName} is now with the HR Admin.`;
    return { ok: true, message };
  } catch (e) {
    return fail(formData, e);
  }
}

/** HR Admin: Approve (the Total Score is calculated and the KPI goes to the Finance Admin) or Return to Department Head. */
export async function hrDecideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const decision = str(formData, "decision") === "return" ? "return" : "approve";
  try {
    const kpi = await db.$transaction(
      (tx) => hrDecide(tx, user, { kpiId: str(formData, "kpiId"), decision, attendance: str(formData, "attendance"), hrRemarks: str(formData, "hrRemarks"), hrNote: str(formData, "hrNote"), paymentAmount: str(formData, "paymentAmount"), reason: str(formData, "reason") }),
      TX,
    );
    const owner = await ownerOf(kpi);
    const title = kpiTitle(kpi);
    await audit(user.id, decision === "return" ? "KPI_HR_RETURNED" : "KPI_HR_APPROVED", "Kpi", kpi.id, { period: title, totalScore: kpi.totalScore, reason: decision === "return" ? kpi.returnRemarks : null });
    if (decision === "return") {
      await notifyKpi("DEPT", kpi, owner.fullName, "KPI returned by the HR Admin", `${user.fullName} returned the KPI of ${owner.fullName} (${owner.employeeId}) for ${title}.\n\nRemarks: ${kpi.returnRemarks}\n\nPlease review it and approve it again.`);
    } else {
      await notifyKpi("FINANCE", kpi, owner.fullName, "KPI approved by the HR Admin", `The KPI of ${owner.fullName} (${owner.employeeId}) for ${title} was approved by ${user.fullName} with a Total Score of ${kpi.totalScore} out of 100. Please review it.`);
      // The employee is told the score, never the payment.
      await notifyKpi("EMPLOYEE", kpi, owner.fullName, "KPI Total Score available", `Your KPI for ${title} was approved by the HR Admin. Total Score: ${kpi.totalScore} out of 100.`);
    }
    revalidateKpi(kpi.id);
    return { ok: true, message: decision === "return" ? `Returned to the Department Head of ${owner.fullName}.` : `Approved with a Total Score of ${kpi.totalScore}. The KPI of ${owner.fullName} is now with the Finance Admin.` };
  } catch (e) {
    return fail(formData, e);
  }
}

/** Finance Admin: Approve (the KPI goes to the Audit Admin) or Reject and return to the HR Admin. */
export async function financeDecideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const decision = str(formData, "decision") === "return" ? "return" : "approve";
  try {
    const kpi = await db.$transaction((tx) => financeDecide(tx, user, { kpiId: str(formData, "kpiId"), decision, note: str(formData, "note"), reason: str(formData, "reason") }), TX);
    const owner = await ownerOf(kpi);
    const title = kpiTitle(kpi);
    await audit(user.id, decision === "return" ? "KPI_FINANCE_RETURNED" : "KPI_FINANCE_APPROVED", "Kpi", kpi.id, { period: title, paymentAmount: kpi.paymentAmount, reason: decision === "return" ? kpi.returnRemarks : null });
    if (decision === "return") {
      await notifyKpi("HR", kpi, owner.fullName, "KPI rejected and returned by the Finance Admin", `${user.fullName} rejected the KPI of ${owner.fullName} (${owner.employeeId}) for ${title} and returned it to you.\n\nRemarks: ${kpi.returnRemarks}`);
    } else {
      await notifyKpi("AUDIT", kpi, owner.fullName, "KPI approved by the Finance Admin", `The KPI of ${owner.fullName} (${owner.employeeId}) for ${title} was approved by ${user.fullName}. Please complete the audit review.`);
    }
    revalidateKpi(kpi.id);
    return { ok: true, message: decision === "return" ? `Rejected and returned to the HR Admin.` : `Approved. The KPI of ${owner.fullName} is now with the Audit Admin.` };
  } catch (e) {
    return fail(formData, e);
  }
}

/** Audit Admin: Approve (the KPI is completed) or Return to the Finance Admin. */
export async function auditDecideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const decision = str(formData, "decision") === "return" ? "return" : "approve";
  try {
    const kpi = await db.$transaction((tx) => auditDecide(tx, user, { kpiId: str(formData, "kpiId"), decision, note: str(formData, "note"), reason: str(formData, "reason") }), TX);
    const owner = await ownerOf(kpi);
    const title = kpiTitle(kpi);
    await audit(user.id, decision === "return" ? "KPI_AUDIT_RETURNED" : "KPI_AUDIT_APPROVED", "Kpi", kpi.id, { period: title, reason: decision === "return" ? kpi.returnRemarks : null });
    if (decision === "return") {
      await notifyKpi("FINANCE", kpi, owner.fullName, "KPI returned by the Audit Admin", `${user.fullName} returned the KPI of ${owner.fullName} (${owner.employeeId}) for ${title}.\n\nRemarks: ${kpi.returnRemarks}`);
    } else {
      await notifyKpi("EMPLOYEE", kpi, owner.fullName, "KPI fully approved", `Your KPI for ${title} has been approved at every stage: Department Head, HR Admin, Finance Admin and Audit Admin.`);
    }
    revalidateKpi(kpi.id);
    return { ok: true, message: decision === "return" ? `Returned to the Finance Admin.` : `Audit approved. The KPI of ${owner.fullName} is complete.` };
  } catch (e) {
    return fail(formData, e);
  }
}

/** Delete with a reason. The record stays in the version history. */
export async function deleteKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const kpi = await db.$transaction((tx) => deleteKpi(tx, user, str(formData, "kpiId"), str(formData, "reason")), TX);
    await audit(user.id, "KPI_DELETED", "Kpi", kpi.id, { reason: kpi.deleteReason });
    revalidateKpi(kpi.id);
    return { ok: true, message: "KPI deleted. It remains in the version history." };
  } catch (e) {
    return fail(formData, e);
  }
}
