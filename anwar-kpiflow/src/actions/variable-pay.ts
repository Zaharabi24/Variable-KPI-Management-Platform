"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { appUrl, sendEmail } from "@/lib/email";
import { MONTHS, ROLES, ROLE_LABELS, USER_STATUS } from "@/lib/constants";
import { VP_MANUAL_CRITERIA, VP_TASK_COUNT, type VpManualKey } from "@/lib/variable-pay";
import { VpError, confirmPayment, decideEvaluation, saveEvaluation, setEligibility, setHrNote, type VpDecision } from "@/lib/variable-pay-service";
import { invalid, type ActionState } from "./form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const TX = { timeout: 20000, maxWait: 10000 };

function fail(formData: FormData, e: unknown): ActionState {
  if (e instanceof VpError) return invalid(formData, e.fields, e.message);
  console.error("[variable-pay]", e);
  return { ok: false, message: "Something went wrong. Nothing was saved. Please try again." };
}

function refresh() {
  revalidatePath("/variable-pay");
  revalidatePath("/", "layout"); // sidebar badge
}

type Ev = { id: string; empName: string; empCode: string; periodYear: number; periodMonth: number; totalScore: number | null; evaluatorId: string };
const periodOf = (ev: Ev) => `${MONTHS[ev.periodMonth - 1]} ${ev.periodYear}`;

/** Notifications go to the in-app Outbox (lib/email). A delivery problem must never undo a saved workflow step. */
async function notify(to: { email: string }[], subject: string, body: string, scope: string) {
  try {
    await Promise.all(to.map((u) => sendEmail({ to: u.email, subject, body, link: appUrl(`/variable-pay?scope=${scope}`) })));
  } catch (e) {
    console.error("[variable-pay] notification failed", e);
  }
}
const superAdmins = () => db.user.findMany({ where: { role: ROLES.SUPER_ADMIN, status: USER_STATUS.ACTIVE }, select: { email: true } });
const financeAdmins = () => db.user.findMany({ where: { status: USER_STATUS.ACTIVE, role: ROLES.FINANCE_ADMIN }, select: { email: true } });
const evaluatorOf = (ev: Ev) => db.user.findMany({ where: { id: ev.evaluatorId }, select: { email: true } });

/** Department Head: add or remove an employee from the Variable Pay eligibility list, with DOJ and Supervisor. */
export async function setEligibilityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const eligible = formData.get("eligible") === "on";
    const u = await setEligibility(db, user, { employeeId: str(formData, "employeeId"), eligible, doj: str(formData, "doj"), supervisor: str(formData, "supervisor") });
    await audit(user.id, eligible ? "VARIABLE_PAY_ELIGIBLE_SET" : "VARIABLE_PAY_ELIGIBLE_REMOVED", "User", u.id, { doj: str(formData, "doj"), supervisor: u.supervisorName });
    refresh();
    return { ok: true, message: eligible ? `${u.fullName} is eligible for Variable Pay.` : `${u.fullName} removed from the Variable Pay list.` };
  } catch (e) {
    return fail(formData, e);
  }
}

/** Department Head: save the evaluation as a draft, or submit it (records the exact time, locks it and sends it to the Super Admin). */
export async function saveEvaluationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const intent = str(formData, "intent") === "submit" ? "submit" : "draft";
  try {
    const scores = {} as Record<VpManualKey, unknown>;
    for (const c of VP_MANUAL_CRITERIA) scores[c.key] = str(formData, c.key);
    const saved = await db.$transaction(
      (tx) =>
        saveEvaluation(
          tx,
          user,
          {
            employeeId: str(formData, "employeeId"),
            year: Number(str(formData, "year")),
            month: Number(str(formData, "month")),
            tasks: Array.from({ length: VP_TASK_COUNT }, (_, i) => ({ task: str(formData, `task_${i + 1}`), score: str(formData, `score_${i + 1}`), remarks: str(formData, `tremarks_${i + 1}`) })),
            scores,
            remarks: str(formData, "remarks"),
          },
          intent,
        ),
      TX,
    );
    await audit(user.id, intent === "submit" ? "VARIABLE_PAY_SUBMITTED" : "VARIABLE_PAY_DRAFT_SAVED", "VariablePayEvaluation", saved.id, {
      employee: saved.empCode, period: `${saved.periodYear}-${String(saved.periodMonth).padStart(2, "0")}`, totalScore: saved.totalScore, submittedAt: saved.submittedAt,
    });
    if (intent === "submit") {
      await notify(await superAdmins(), `Variable Pay request submitted — ${saved.empName} (${periodOf(saved)})`,
        `${user.fullName} submitted a Variable Pay request for ${saved.empName} (${saved.empCode}), ${periodOf(saved)}. Total Score ${saved.totalScore} of 100. It is waiting for your review.`, "review");
    }
    refresh();
    return {
      ok: true,
      message: intent === "submit" ? `Submitted ${saved.empName}'s Variable Pay request for ${periodOf(saved)} to the Super Admin — total score ${saved.totalScore}.` : `Draft saved for ${saved.empName} (${periodOf(saved)}).`,
    };
  } catch (e) {
    return fail(formData, e);
  }
}

/** Super Admin: approve, return (with feedback) or reject (with a reason) a submitted request. */
export async function decideEvaluationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const d = str(formData, "decision");
  const decision: VpDecision = d === "approve" || d === "return" || d === "reject" ? d : "return";
  try {
    const comment = str(formData, "comment");
    const ev = await db.$transaction((tx) => decideEvaluation(tx, user, { evaluationId: str(formData, "evaluationId"), decision, comment }), TX);
    const past = decision === "approve" ? "approved" : decision === "return" ? "returned" : "rejected";
    await audit(user.id, `VARIABLE_PAY_${past.toUpperCase()}`, "VariablePayEvaluation", ev.id, { employee: ev.empCode, comment: ev.decisionComment });
    const feedback = ev.decisionComment ? ` Comment from ${user.fullName}: ${ev.decisionComment}` : "";
    await notify(await evaluatorOf(ev), `Variable Pay request ${past} — ${ev.empName} (${periodOf(ev)})`,
      `Your Variable Pay request for ${ev.empName} (${ev.empCode}), ${periodOf(ev)}, was ${past} by the Super Admin.${feedback}${decision === "return" ? " Please correct it and submit again." : ""}`, "department");
    if (decision === "approve") {
      await notify(await financeAdmins(), `Variable Pay approved for payment — ${ev.empName} (${periodOf(ev)})`,
        `The Variable Pay request for ${ev.empName} (${ev.empCode}), ${periodOf(ev)}, was approved with a Total Score of ${ev.totalScore}. Please confirm the payment amount.`, "finance");
    }
    refresh();
    return { ok: true, message: decision === "approve" ? `Approved ${ev.empName}'s request. It is now with the Finance Admin for payment.` : decision === "return" ? `Returned ${ev.empName}'s request to the Department Head with your feedback.` : `Rejected ${ev.empName}'s request.` };
  } catch (e) {
    return fail(formData, e);
  }
}

/** HR: record the HR Note on a submitted or approved request. */
export async function hrNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const ev = await db.$transaction((tx) => setHrNote(tx, user, { evaluationId: str(formData, "evaluationId"), note: str(formData, "hrNote") }), TX);
    await audit(user.id, "VARIABLE_PAY_HR_NOTE", "VariablePayEvaluation", ev.id, { employee: ev.empCode });
    refresh();
    return { ok: true, message: `HR note saved for ${ev.empName}.` };
  } catch (e) {
    return fail(formData, e);
  }
}

/** Finance Admin: confirm the payment amount of an approved request. */
export async function confirmPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const ev = await db.$transaction(
      (tx) => confirmPayment(tx, user, { evaluationId: str(formData, "evaluationId"), amount: str(formData, "amount"), reference: str(formData, "reference"), note: str(formData, "note") }),
      TX,
    );
    await audit(user.id, "VARIABLE_PAY_PAYMENT_CONFIRMED", "VariablePayEvaluation", ev.id, { employee: ev.empCode, amount: ev.paymentAmount, reference: ev.paymentReference });
    const amount = (ev.paymentAmount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 });
    await notify([...(await evaluatorOf(ev)), ...(await superAdmins())], `Variable Pay payment confirmed — ${ev.empName} (${periodOf(ev)})`,
      `The ${ROLE_LABELS[user.role]} (${user.fullName}) confirmed a Variable Pay payment of BDT ${amount} for ${ev.empName} (${ev.empCode}), ${periodOf(ev)}.`, "review");
    refresh();
    return { ok: true, message: `Payment of BDT ${amount} confirmed for ${ev.empName}.` };
  } catch (e) {
    return fail(formData, e);
  }
}
