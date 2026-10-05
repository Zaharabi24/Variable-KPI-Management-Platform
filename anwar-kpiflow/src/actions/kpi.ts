"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { KPI_TASK_COUNT, kpiTitle } from "@/lib/kpi";
import { KpiError, saveSheet, type TaskInput } from "@/lib/kpi-service";
import { notifyKpi } from "@/lib/kpi-notify";
import { revalidateKpi } from "@/lib/kpi-revalidate";
import { storeEvidence, validateEvidence } from "@/lib/storage";
import { invalid, type ActionState } from "./form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const TX = { timeout: 20000, maxWait: 10000 };

/**
 * Create KPI — one action, two intents, used for a new KPI, a saved draft and a KPI returned for correction:
 *  - "draft":  keep what has been typed so far; nothing is sent.
 *  - "submit": all five tasks and scores are required; the KPI goes to the Approval Person (the Department Head).
 * After submission the employee can no longer change anything.
 */
export async function saveKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const intent = str(formData, "intent") === "submit" ? "submit" : "draft";

  const file = formData.get("evidence");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile) {
    const e = validateEvidence(file);
    if (e) return invalid(formData, { evidence: e }, `${e} Nothing was ${intent === "submit" ? "submitted" : "saved"} yet.`);
  }
  const tasks: TaskInput[] = Array.from({ length: KPI_TASK_COUNT }, (_, i) => ({
    task: str(formData, `task_${i + 1}`), score: str(formData, `score_${i + 1}`), remarks: str(formData, `tremarks_${i + 1}`),
  }));

  try {
    const stored = hasFile ? await storeEvidence(file) : null;
    const kpi = await db.$transaction(async (tx) => {
      const saved = await saveSheet(
        tx,
        user,
        { kpiId: str(formData, "kpiId") || null, year: Number(str(formData, "periodYear")), month: Number(str(formData, "periodMonth")), tasks, remarks: str(formData, "remarks"), approverId: str(formData, "approverId") },
        intent,
        stored?.fileName,
      );
      if (stored) await tx.evidenceFile.create({ data: { ...stored, kpiId: saved.id, uploadedById: user.id } });
      return saved;
    }, TX);

    if (stored) await audit(user.id, "EVIDENCE_UPLOADED", "Kpi", kpi.id, { fileName: stored.fileName, sha256: stored.sha256 });
    const title = kpiTitle(kpi);
    if (intent === "draft") {
      await audit(user.id, "KPI_DRAFT_SAVED", "Kpi", kpi.id, { period: title });
      revalidateKpi(kpi.id);
      return { ok: true, message: `KPI for ${title} saved as draft.`, values: { kpiId: kpi.id } };
    }
    await audit(user.id, kpi.currentVersion > 1 ? "KPI_RESUBMITTED" : "KPI_SUBMITTED", "Kpi", kpi.id, { period: title, selfScore: kpi.selfScore, approverId: kpi.approverId });
    await notifyKpi("DEPT", kpi, user.fullName, "KPI submitted for your approval",
      `${user.fullName} (${user.employeeId}) submitted the KPI for ${title} with a self-scored KPI (5) of ${kpi.selfScore} out of 50. Please review the score breakdown and complete your part.`);
    revalidateKpi(kpi.id);
    return { ok: true, message: `KPI for ${title} submitted to your Department Head.`, values: { kpiId: kpi.id, submitted: "1" } };
  } catch (e) {
    if (e instanceof KpiError) {
      // Name the actual problem: the highlighted field may be scrolled out of view.
      const problems = Object.values(e.fields);
      const message = problems.length === 0 ? e.message : problems.length === 1 ? problems[0] : `${problems[0]} (and ${problems.length - 1} more to correct)`;
      return invalid(formData, e.fields, `${message} ${intent === "submit" ? "Nothing was submitted yet." : "Nothing was saved yet."}`);
    }
    console.error("[kpi]", e);
    return { ok: false, message: "Something went wrong. Nothing was saved. Please try again." };
  }
}

/* FR-PRO-02 — Profile */
export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const phone = String(formData.get("corporatePhone") ?? "").trim();
  if (phone && !/^[+\d][\d\s\-()]{6,20}$/.test(phone)) return invalid(formData, { corporatePhone: "Enter a valid phone number." });
  const designation = String(formData.get("designation") ?? "").trim().slice(0, 80);
  await db.user.update({ where: { id: user.id }, data: { corporatePhone: phone || null, designation: designation || null } });
  await audit(user.id, "PROFILE_UPDATED", "User", user.id, { corporatePhone: phone || null });
  revalidatePath("/profile");
  return { ok: true, message: "Profile updated." };
}
