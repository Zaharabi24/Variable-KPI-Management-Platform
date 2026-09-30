"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser, isSuperAdmin } from "@/lib/auth";
import { achievementPct, calculatedScore } from "@/lib/calc";
import { KPI_STATUS, ROLES } from "@/lib/constants";
import { storeEvidence, validateEvidence } from "@/lib/storage";
import { diffKpi, snapshotOf } from "@/lib/versions";
import { flatten, invalid, type ActionState } from "./form";

const kpiSchema = z.object({
  name: z.string().trim().min(2, "KPI name is required."),
  category: z.enum(["PROJECT", "PEOPLE_CULTURE"]).optional(),
  periodYear: z.coerce.number().int().min(2020).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12),
  target: z.coerce.number({ message: "Target must be a number." }).positive("Target must be greater than zero."),
  actual: z.coerce.number({ message: "Actual must be a number." }).min(0, "Actual cannot be negative."),
  unit: z.string().trim().max(20).default(""),
  weight: z.coerce.number({ message: "KPI Weight must be a number." }).gt(0, "KPI Weight must be greater than 0.").max(100, "KPI Weight cannot exceed 100."),
  remarks: z.string().trim().min(3, "Remarks are required."),
  approverId: z.string({ message: "Select an Approval Person." }).min(1, "Select an Approval Person."),
});

/** Approval Person list (FR-KPI-02 / BR-09 / OI-04). */
export async function approverOptionsFor(user: { id: string; role: string; departmentId: string | null }) {
  if (user.role === ROLES.DEPARTMENT_HEAD) {
    return db.user.findMany({ where: { role: ROLES.SUPER_ADMIN, status: "ACTIVE" }, orderBy: { fullName: "asc" } });
  }
  if (!user.departmentId) return [];
  return db.user.findMany({
    where: { role: ROLES.DEPARTMENT_HEAD, departmentId: user.departmentId, status: "ACTIVE", NOT: { id: user.id } },
    orderBy: { fullName: "asc" },
  });
}

/* FR-KPI-01..05 — Create and submit */
export async function createKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (isSuperAdmin(user)) return { ok: false, message: "The Super Admin does not submit KPIs." };

  const parsed = kpiSchema.safeParse(Object.fromEntries(formData));
  const errors: Record<string, string> = parsed.success ? {} : flatten(parsed.error);

  const file = formData.get("evidence");
  const fileErr = file instanceof File ? validateEvidence(file) : "Evidence file is required.";
  if (fileErr) errors.evidence = fileErr;
  if (!parsed.success || Object.keys(errors).length) return invalid(formData, errors);
  const d = parsed.data;

  const approvers = await approverOptionsFor(user);
  if (!approvers.some((a) => a.id === d.approverId)) {
    return { ok: false, errors: { approverId: "Approval Person must be a Department Head of your department." } };
  }

  const achievement = achievementPct(d.target, d.actual);
  const score = calculatedScore(achievement);
  const stored = await storeEvidence(file as File);

  const kpi = await db.kpi.create({
    data: {
      name: d.name,
      category: d.category ?? "PROJECT",
      periodYear: d.periodYear,
      periodMonth: d.periodMonth,
      target: d.target,
      actual: d.actual,
      unit: d.unit,
      weight: d.weight,
      achievement,
      calculatedScore: score,
      status: KPI_STATUS.SUBMITTED,
      remarks: d.remarks,
      ownerId: user.id,
      approverId: d.approverId,
      currentVersion: 1,
      evidence: { create: { ...stored, uploadedById: user.id } },
    },
  });
  await db.kpiVersion.create({
    data: {
      kpiId: kpi.id,
      versionNo: 1,
      action: "SUBMIT",
      snapshot: snapshotOf(kpi),
      changes: JSON.stringify([]),
      changedById: user.id,
    },
  });
  await audit(user.id, "KPI_SUBMITTED", "Kpi", kpi.id, { name: kpi.name, approverId: d.approverId });
  await audit(user.id, "EVIDENCE_UPLOADED", "Kpi", kpi.id, { fileName: stored.fileName, sha256: stored.sha256 });
  return { ok: true, message: `"${kpi.name}" submitted to your Approval Person.` };
}

/* FR-KPI-07 — Resubmit a Returned KPI (new version, previous kept) */
export async function resubmitKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const kpiId = String(formData.get("kpiId") ?? "");
  const kpi = await db.kpi.findUnique({ where: { id: kpiId } });
  if (!kpi || kpi.ownerId !== user.id || kpi.deletedAt) return { ok: false, message: "KPI not found." };
  if (kpi.status !== KPI_STATUS.RETURNED) return { ok: false, message: "Only a Returned KPI can be edited and resubmitted." };

  const parsed = kpiSchema.safeParse(Object.fromEntries(formData));
  const errors: Record<string, string> = parsed.success ? {} : flatten(parsed.error);
  const file = formData.get("evidence");
  const hasNewFile = file instanceof File && file.size > 0;
  if (hasNewFile) {
    const e = validateEvidence(file as File);
    if (e) errors.evidence = e;
  }
  if (!parsed.success || Object.keys(errors).length) return invalid(formData, errors);
  const d = parsed.data;
  const approvers = await approverOptionsFor(user);
  if (!approvers.some((a) => a.id === d.approverId)) {
    return { ok: false, errors: { approverId: "Approval Person must be a Department Head of your department." } };
  }

  const achievement = achievementPct(d.target, d.actual);
  const score = calculatedScore(achievement);
  const updated = await db.kpi.update({
    where: { id: kpi.id },
    data: {
      name: d.name, category: d.category ?? kpi.category, periodYear: d.periodYear, periodMonth: d.periodMonth,
      target: d.target, actual: d.actual, unit: d.unit || kpi.unit, weight: d.weight, remarks: d.remarks,
      approverId: d.approverId, achievement, calculatedScore: score, finalScore: null,
      status: KPI_STATUS.SUBMITTED, returnRemarks: null, decisionReason: null, decidedAt: null,
      submittedAt: new Date(), currentVersion: kpi.currentVersion + 1,
    },
  });
  const changes = diffKpi(kpi, updated);
  if (hasNewFile) {
    const stored = await storeEvidence(file as File);
    await db.evidenceFile.create({ data: { ...stored, kpiId: kpi.id, uploadedById: user.id } });
    changes.push({ field: "evidence", oldValue: null, newValue: stored.fileName });
    await audit(user.id, "EVIDENCE_UPLOADED", "Kpi", kpi.id, { fileName: stored.fileName, sha256: stored.sha256 });
  }
  await db.kpiVersion.create({
    data: { kpiId: kpi.id, versionNo: updated.currentVersion, action: "RESUBMIT", snapshot: snapshotOf(updated), changes: JSON.stringify(changes), changedById: user.id },
  });
  await audit(user.id, "KPI_RESUBMITTED", "Kpi", kpi.id, { version: updated.currentVersion });
  redirect(`/my-kpi/${kpi.id}?resubmitted=1`);
}

/* FR-PRO-02 — Profile */
export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const phone = String(formData.get("corporatePhone") ?? "").trim();
  if (phone && !/^[+\d][\d\s\-()]{6,20}$/.test(phone)) return { ok: false, errors: { corporatePhone: "Enter a valid phone number." } };
  const designation = String(formData.get("designation") ?? "").trim().slice(0, 80);
  await db.user.update({ where: { id: user.id }, data: { corporatePhone: phone || null, designation: designation || null } });
  await audit(user.id, "PROFILE_UPDATED", "User", user.id, { corporatePhone: phone || null });
  revalidatePath("/profile");
  return { ok: true, message: "Profile updated." };
}

