"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { MONTHS } from "@/lib/constants";
import { VP_MANUAL_CRITERIA, VP_TASK_COUNT, type VpManualKey } from "@/lib/variable-pay";
import { VpError, returnEvaluation, saveEvaluation, setEligibility, setHrNote } from "@/lib/variable-pay-service";
import { invalid, type ActionState } from "./form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function fail(formData: FormData, e: unknown): ActionState {
  if (e instanceof VpError) return invalid(formData, e.fields, e.message);
  console.error("[variable-pay]", e);
  return { ok: false, message: "Something went wrong. Nothing was saved. Please try again." };
}

/** Department Head: add or remove an employee from the Variable Pay eligibility list, with DOJ and Supervisor. */
export async function setEligibilityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const eligible = formData.get("eligible") === "on";
    const u = await setEligibility(db, user, { employeeId: str(formData, "employeeId"), eligible, doj: str(formData, "doj"), supervisor: str(formData, "supervisor") });
    await audit(user.id, eligible ? "VARIABLE_PAY_ELIGIBLE_SET" : "VARIABLE_PAY_ELIGIBLE_REMOVED", "User", u.id, { doj: str(formData, "doj"), supervisor: u.supervisorName });
    revalidatePath("/variable-pay");
    return { ok: true, message: eligible ? `${u.fullName} is eligible for Variable Pay.` : `${u.fullName} removed from the Variable Pay list.` };
  } catch (e) {
    return fail(formData, e);
  }
}

/** Department Head: save the evaluation as a draft, or submit it (locks the record and sends it to HR). */
export async function saveEvaluationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const intent = str(formData, "intent") === "submit" ? "submit" : "draft";
  try {
    const scores = {} as Record<VpManualKey, unknown>;
    for (const c of VP_MANUAL_CRITERIA) scores[c.key] = str(formData, c.key);
    const year = Number(str(formData, "year"));
    const month = Number(str(formData, "month"));
    const saved = await db.$transaction(
      (tx) =>
        saveEvaluation(
          tx,
          user,
          {
            employeeId: str(formData, "employeeId"),
            year,
            month,
            tasks: Array.from({ length: VP_TASK_COUNT }, (_, i) => ({ task: str(formData, `task_${i + 1}`), score: str(formData, `score_${i + 1}`), remarks: str(formData, `tremarks_${i + 1}`) })),
            scores,
            remarks: str(formData, "remarks"),
          },
          intent,
        ),
      { timeout: 20000, maxWait: 10000 },
    );
    await audit(user.id, intent === "submit" ? "VARIABLE_PAY_SUBMITTED" : "VARIABLE_PAY_DRAFT_SAVED", "VariablePayEvaluation", saved.id, {
      employee: saved.empCode, period: `${saved.periodYear}-${String(saved.periodMonth).padStart(2, "0")}`, totalScore: saved.totalScore,
    });
    revalidatePath("/variable-pay");
    const period = `${MONTHS[saved.periodMonth - 1]} ${saved.periodYear}`;
    return {
      ok: true,
      message: intent === "submit" ? `Submitted ${saved.empName}'s Variable Pay evaluation for ${period} — total score ${saved.totalScore}.` : `Draft saved for ${saved.empName} (${period}).`,
    };
  } catch (e) {
    return fail(formData, e);
  }
}

/** HR: record the HR Note on a submitted evaluation. */
export async function hrNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const ev = await setHrNote(db, user, { evaluationId: str(formData, "evaluationId"), note: str(formData, "hrNote") });
    await audit(user.id, "VARIABLE_PAY_HR_NOTE", "VariablePayEvaluation", ev.id, { employee: ev.empCode });
    revalidatePath("/variable-pay");
    return { ok: true, message: `HR note saved for ${ev.empName}.` };
  } catch (e) {
    return fail(formData, e);
  }
}

/** HR: return a submitted evaluation to the Department Head for correction, with a reason. */
export async function returnEvaluationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const ev = await returnEvaluation(db, user, { evaluationId: str(formData, "evaluationId"), reason: str(formData, "reason") });
    await audit(user.id, "VARIABLE_PAY_RETURNED", "VariablePayEvaluation", ev.id, { employee: ev.empCode, reason: ev.returnReason });
    revalidatePath("/variable-pay");
    return { ok: true, message: `Returned ${ev.empName}'s evaluation to the Department Head.` };
  } catch (e) {
    return fail(formData, e);
  }
}
