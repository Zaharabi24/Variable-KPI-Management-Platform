"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser, isSuperAdmin, isSystemAdmin, canChangeTarget } from "@/lib/auth";
import { achievementPct, calculatedScore } from "@/lib/calc";
import { KPI_STATUS, ROLES } from "@/lib/constants";
import { storeEvidence, validateEvidence } from "@/lib/storage";
import { diffKpi, snapshotOf } from "@/lib/versions";
import { flatten, invalid, type ActionState } from "./form";

/** Full validation used when a KPI is submitted (FR-KPI-02/04). */
const submitSchema = z.object({
  name: z.string().trim().min(2, "KPI name is required."),
  category: z.enum(["PROJECT", "PEOPLE_CULTURE"]).optional(),
  periodYear: z.coerce.number().int().min(2020).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12),
  target: z.coerce.number({ message: "Target must be a number." }).positive("Target must be greater than zero."),
  actual: z.coerce.number({ message: "Actual must be a number." }).min(0, "Actual cannot be negative."),
  unit: z.string().trim().max(20).default(""),
  weight: z.coerce.number({ message: "KPI Weight must be a number." }).gt(0, "KPI Weight must be greater than 0.").max(100, "KPI Weight cannot exceed 100."),
  remarks: z.string().trim().default(""), // optional
  approverId: z.string({ message: "Select an Approval Person." }).min(1, "Select an Approval Person."),
});

/** A draft only needs a name and the target (the target is set once and then fixed). */
const draftSchema = z.object({
  name: z.string().trim().min(2, "KPI name is required."),
  periodYear: z.coerce.number().int().min(2020).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12),
  target: z.coerce.number({ message: "Target must be a number." }).positive("Target must be greater than zero."),
  actual: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0, "Actual cannot be negative.").optional()),
  unit: z.string().trim().max(20).default(""),
  weight: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().gt(0, "KPI Weight must be greater than 0.").max(100, "KPI Weight cannot exceed 100.").optional()),
  remarks: z.string().trim().default(""),
  approverId: z.string().optional(),
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

/**
 * Create KPI form — one action, two intents:
 *  - "draft":  save (or update) a Draft. Only KPI name and Target are required; the Target becomes fixed once saved.
 *  - "submit": full validation, then the KPI goes to the Approval Person as Submitted (version 1).
 * Employees can never change a saved Target; Department Heads, the System Admin and the Super Admin can (changeTargetAction).
 */
export async function saveKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (isSuperAdmin(user) || isSystemAdmin(user)) return { ok: false, message: "Administrators do not submit KPIs." };
  const intent = formData.get("intent") === "draft" ? "draft" : "submit";
  const kpiId = String(formData.get("kpiId") ?? "");

  // Existing draft (target already fixed)
  const existing = kpiId ? await db.kpi.findUnique({ where: { id: kpiId }, include: { evidence: { select: { id: true } } } }) : null;
  if (kpiId && (!existing || existing.ownerId !== user.id || existing.deletedAt)) return { ok: false, message: "Draft not found." };
  if (existing && existing.status !== KPI_STATUS.DRAFT) return { ok: false, message: "Only a Draft can be edited here." };
  if (existing) formData.set("target", String(existing.target)); // locked

  const file = formData.get("evidence");
  const hasNewFile = file instanceof File && file.size > 0;
  const errors: Record<string, string> = {};
  if (hasNewFile) {
    const e = validateEvidence(file as File);
    if (e) errors.evidence = e;
  }

  if (intent === "draft") {
    const parsed = draftSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(formData, { ...errors, ...flatten(parsed.error) });
    if (Object.keys(errors).length) return invalid(formData, errors);
    const d = parsed.data;
    if (d.approverId) {
      const approvers = await approverOptionsFor(user);
      if (!approvers.some((a) => a.id === d.approverId)) return invalid(formData, { approverId: "Approval Person must be a Department Head of your department." });
    }
    const actual = d.actual ?? 0;
    const achievement = d.actual === undefined ? 0 : achievementPct(d.target, actual);
    const data = {
      name: d.name, periodYear: d.periodYear, periodMonth: d.periodMonth, target: d.target, actual, unit: d.unit,
      weight: d.weight ?? 0, remarks: d.remarks, approverId: d.approverId || null, achievement, calculatedScore: calculatedScore(achievement),
      status: KPI_STATUS.DRAFT,
    };
    const kpi = existing
      ? await db.kpi.update({ where: { id: existing.id }, data })
      : await db.kpi.create({ data: { ...data, category: "PROJECT", ownerId: user.id, currentVersion: 0 } });
    if (hasNewFile) {
      const stored = await storeEvidence(file as File);
      await db.evidenceFile.create({ data: { ...stored, kpiId: kpi.id, uploadedById: user.id } });
      await audit(user.id, "EVIDENCE_UPLOADED", "Kpi", kpi.id, { fileName: stored.fileName, sha256: stored.sha256 });
    }
    await audit(user.id, existing ? "KPI_DRAFT_UPDATED" : "KPI_DRAFT_SAVED", "Kpi", kpi.id, { name: kpi.name, target: kpi.target });
    return { ok: true, message: `"${kpi.name}" saved as draft. The target is now fixed.` };
  }

  // Submit
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, { ...errors, ...flatten(parsed.error) });
  if (Object.keys(errors).length) return invalid(formData, errors);
  const d = parsed.data;
  const approvers = await approverOptionsFor(user);
  if (!approvers.some((a) => a.id === d.approverId)) return invalid(formData, { approverId: "Approval Person must be a Department Head of your department." });

  const achievement = achievementPct(d.target, d.actual);
  const score = calculatedScore(achievement);
  const data = {
    name: d.name, periodYear: d.periodYear, periodMonth: d.periodMonth, target: d.target, actual: d.actual, unit: d.unit, weight: d.weight,
    remarks: d.remarks, approverId: d.approverId, achievement, calculatedScore: score, finalScore: null,
    status: KPI_STATUS.SUBMITTED, submittedAt: new Date(), currentVersion: 1,
  };
  const kpi = existing
    ? await db.kpi.update({ where: { id: existing.id }, data })
    : await db.kpi.create({ data: { ...data, category: d.category ?? "PROJECT", ownerId: user.id } });
  if (hasNewFile) {
    const stored = await storeEvidence(file as File);
    await db.evidenceFile.create({ data: { ...stored, kpiId: kpi.id, uploadedById: user.id } });
    await audit(user.id, "EVIDENCE_UPLOADED", "Kpi", kpi.id, { fileName: stored.fileName, sha256: stored.sha256 });
  }
  await db.kpiVersion.create({
    data: { kpiId: kpi.id, versionNo: 1, action: "SUBMIT", snapshot: snapshotOf(kpi), changes: JSON.stringify([]), changedById: user.id },
  });
  await audit(user.id, "KPI_SUBMITTED", "Kpi", kpi.id, { name: kpi.name, approverId: d.approverId, fromDraft: !!existing });
  return { ok: true, message: `"${kpi.name}" submitted to your Approval Person.` };
}

/* FR-KPI-07 — Resubmit a Returned KPI (new version, previous kept). The target stays fixed. */
export async function resubmitKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const kpiId = String(formData.get("kpiId") ?? "");
  const kpi = await db.kpi.findUnique({ where: { id: kpiId } });
  if (!kpi || kpi.ownerId !== user.id || kpi.deletedAt) return { ok: false, message: "KPI not found." };
  if (kpi.status !== KPI_STATUS.RETURNED) return { ok: false, message: "Only a Returned KPI can be edited and resubmitted." };
  formData.set("target", String(kpi.target)); // locked

  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
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
  if (!approvers.some((a) => a.id === d.approverId)) return invalid(formData, { approverId: "Approval Person must be a Department Head of your department." });

  const achievement = achievementPct(kpi.target, d.actual);
  const score = calculatedScore(achievement);
  const updated = await db.kpi.update({
    where: { id: kpi.id },
    data: {
      name: d.name, category: d.category ?? kpi.category, periodYear: d.periodYear, periodMonth: d.periodMonth,
      actual: d.actual, unit: d.unit || kpi.unit, weight: d.weight, remarks: d.remarks,
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

/* Target change — Department Head (own department), System Admin or Super Admin only; never the employee. */
const targetSchema = z.object({
  kpiId: z.string(),
  target: z.coerce.number({ message: "Target must be a number." }).positive("Target must be greater than zero."),
  reason: z.string().trim().min(5, "A reason is required to change a target."),
});

export async function changeTargetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = targetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const d = parsed.data;
  const kpi = await db.kpi.findUnique({ where: { id: d.kpiId }, include: { owner: true } });
  if (!kpi || kpi.deletedAt) return { ok: false, message: "KPI not found." };
  if (!canChangeTarget(user, kpi)) return { ok: false, message: "Only the employee's Department Head, the System Admin or the Super Admin can change a target." };
  const changeable: string[] = [KPI_STATUS.DRAFT, KPI_STATUS.SUBMITTED, KPI_STATUS.RETURNED];
  if (!changeable.includes(kpi.status)) return { ok: false, message: "The target of a decided KPI cannot be changed." };

  const achievement = kpi.status === KPI_STATUS.DRAFT && kpi.actual === 0 ? 0 : achievementPct(d.target, kpi.actual);
  const updated = await db.kpi.update({
    where: { id: kpi.id },
    data: {
      target: d.target, achievement, calculatedScore: calculatedScore(achievement),
      ...(kpi.status === KPI_STATUS.DRAFT ? {} : { currentVersion: kpi.currentVersion + 1 }),
    },
  });
  if (kpi.status !== KPI_STATUS.DRAFT) {
    await db.kpiVersion.create({
      data: { kpiId: kpi.id, versionNo: updated.currentVersion, action: "TARGET_CHANGE", snapshot: snapshotOf(updated), changes: JSON.stringify(diffKpi(kpi, updated)), reason: d.reason, changedById: user.id },
    });
  }
  await audit(user.id, "KPI_TARGET_CHANGED", "Kpi", kpi.id, { from: kpi.target, to: d.target, reason: d.reason });
  revalidatePath(`/my-kpi/${kpi.id}`);
  return { ok: true, message: `Target of "${kpi.name}" changed to ${d.target}.` };
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
