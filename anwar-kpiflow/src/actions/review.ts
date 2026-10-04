"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser, canDecideKpi } from "@/lib/auth";
import { achievementPct, calculatedScore } from "@/lib/calc";
import { KPI_STATUS } from "@/lib/constants";
import { diffKpi, snapshotOf } from "@/lib/versions";
import { flatten, invalid, type ActionState } from "./form";

async function loadForDecision(kpiId: string) {
  const user = await requireUser();
  const kpi = await db.kpi.findUnique({ where: { id: kpiId }, include: { owner: true } });
  if (!kpi || kpi.deletedAt) return { user, kpi: null, error: "Request not found." };
  if (!canDecideKpi(user, kpi)) return { user, kpi: null, error: "You are not allowed to act on this request." };
  return { user, kpi, error: null };
}

function revalidateAll(kpiId: string) {
  for (const p of ["/pending-requests", "/dashboard", "/leaderboard", "/my-kpi", `/my-kpi/${kpiId}`, "/performance", "/admin/kpis", "/admin/versions"]) {
    revalidatePath(p);
  }
}

/* FR-REV-06 — Approve: calculated score becomes final */
export async function approveKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, kpi, error } = await loadForDecision(String(formData.get("kpiId")));
  if (!kpi) return { ok: false, message: error ?? undefined };
  if (kpi.status !== KPI_STATUS.SUBMITTED) return { ok: false, message: "Only a Submitted KPI can be approved." };

  const updated = await db.kpi.update({
    where: { id: kpi.id },
    data: { status: KPI_STATUS.APPROVED, finalScore: kpi.calculatedScore, decidedAt: new Date(), decisionReason: null, currentVersion: kpi.currentVersion + 1 },
  });
  await db.$transaction([
    db.kpiVersion.create({ data: { kpiId: kpi.id, versionNo: updated.currentVersion, action: "APPROVE", snapshot: snapshotOf(updated), changes: JSON.stringify(diffKpi(kpi, updated)), changedById: user.id } }),
    db.reviewDecision.create({ data: { kpiId: kpi.id, reviewerId: user.id, decision: "APPROVE" } }),
  ]);
  await audit(user.id, "KPI_APPROVED", "Kpi", kpi.id, { finalScore: updated.finalScore });
  revalidateAll(kpi.id);
  return { ok: true, message: `Approved "${kpi.name}" with final score ${updated.finalScore}.` };
}

/* FR-REV-06/07 — Adjustment: change Score, Weight or other field with a reason, then approve */
const adjustSchema = z.object({
  kpiId: z.string(),
  finalScore: z.coerce.number({ message: "Enter the adjusted score." }).min(0, "Score cannot be negative."),
  weight: z.coerce.number({ message: "Enter the KPI weight." }).gt(0, "Weight must be greater than 0.").max(100, "Weight cannot exceed 100."),
  target: z.coerce.number().positive("Target must be greater than zero."),
  actual: z.coerce.number().min(0),
  reason: z.string().trim().min(5, "A reason is required for every adjustment."),
});

export async function adjustKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = adjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const d = parsed.data;
  const { user, kpi, error } = await loadForDecision(d.kpiId);
  if (!kpi) return { ok: false, message: error ?? undefined };
  if (kpi.status !== KPI_STATUS.SUBMITTED) return { ok: false, message: "Only a Submitted KPI can be adjusted." };

  const achievement = achievementPct(d.target, d.actual);
  const updated = await db.kpi.update({
    where: { id: kpi.id },
    data: {
      target: d.target, actual: d.actual, weight: d.weight, achievement, calculatedScore: calculatedScore(achievement),
      finalScore: d.finalScore, status: KPI_STATUS.ADJUSTED, decisionReason: d.reason, decidedAt: new Date(),
      currentVersion: kpi.currentVersion + 1,
    },
  });
  const changes = diffKpi(kpi, updated);
  await db.$transaction([
    db.kpiVersion.create({ data: { kpiId: kpi.id, versionNo: updated.currentVersion, action: "ADJUST", snapshot: snapshotOf(updated), changes: JSON.stringify(changes), reason: d.reason, changedById: user.id } }),
    db.reviewDecision.create({ data: { kpiId: kpi.id, reviewerId: user.id, decision: "ADJUST", reason: d.reason } }),
  ]);
  await audit(user.id, "KPI_ADJUSTED", "Kpi", kpi.id, { changes, reason: d.reason });
  revalidateAll(kpi.id);
  return { ok: true, message: `Adjusted and approved "${kpi.name}" with final score ${d.finalScore}.` };
}

/* FR-REV-06/07 — Return to Employee with remarks */
export async function returnKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) return invalid(formData, { reason: "Remarks are required when returning a KPI." });
  const { user, kpi, error } = await loadForDecision(String(formData.get("kpiId")));
  if (!kpi) return { ok: false, message: error ?? undefined };
  if (kpi.status !== KPI_STATUS.SUBMITTED) return { ok: false, message: "Only a Submitted KPI can be returned." };

  const updated = await db.kpi.update({
    where: { id: kpi.id },
    data: { status: KPI_STATUS.RETURNED, returnRemarks: reason, decisionReason: reason, decidedAt: new Date(), currentVersion: kpi.currentVersion + 1 },
  });
  await db.$transaction([
    db.kpiVersion.create({ data: { kpiId: kpi.id, versionNo: updated.currentVersion, action: "RETURN", snapshot: snapshotOf(updated), changes: JSON.stringify(diffKpi(kpi, updated)), reason, changedById: user.id } }),
    db.reviewDecision.create({ data: { kpiId: kpi.id, reviewerId: user.id, decision: "RETURN", reason } }),
  ]);
  await audit(user.id, "KPI_RETURNED", "Kpi", kpi.id, { reason });
  revalidateAll(kpi.id);
  return { ok: true, message: `Returned "${kpi.name}" to ${kpi.owner.fullName} for correction.` };
}

/* FR-REV-06/07 — Reject with reason */
export async function rejectKpiAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) return invalid(formData, { reason: "A reason is required when rejecting a KPI." });
  const { user, kpi, error } = await loadForDecision(String(formData.get("kpiId")));
  if (!kpi) return { ok: false, message: error ?? undefined };
  if (kpi.status !== KPI_STATUS.SUBMITTED) return { ok: false, message: "Only a Submitted KPI can be rejected." };

  const updated = await db.kpi.update({
    where: { id: kpi.id },
    data: { status: KPI_STATUS.REJECTED, finalScore: null, decisionReason: reason, decidedAt: new Date(), currentVersion: kpi.currentVersion + 1 },
  });
  await db.$transaction([
    db.kpiVersion.create({ data: { kpiId: kpi.id, versionNo: updated.currentVersion, action: "REJECT", snapshot: snapshotOf(updated), changes: JSON.stringify(diffKpi(kpi, updated)), reason, changedById: user.id } }),
    db.reviewDecision.create({ data: { kpiId: kpi.id, reviewerId: user.id, decision: "REJECT", reason } }),
  ]);
  await audit(user.id, "KPI_REJECTED", "Kpi", kpi.id, { reason });
  revalidateAll(kpi.id);
  return { ok: true, message: `Rejected "${kpi.name}".` };
}

/* FR-REV-05 — Edit / Update a pending request (recorded as a new version) */
const editSchema = z.object({
  kpiId: z.string(),
  name: z.string().trim().min(2, "KPI name is required."),
  target: z.coerce.number().positive("Target must be greater than zero."),
  actual: z.coerce.number().min(0),
  weight: z.coerce.number().gt(0).max(100, "Weight must be between 0 and 100."),
  remarks: z.string().trim().default(""), // optional, as on submission
  reason: z.string().trim().min(5, "Describe why the request was edited."),
});

export async function editKpiRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const d = parsed.data;
  const { user, kpi, error } = await loadForDecision(d.kpiId);
  if (!kpi) return { ok: false, message: error ?? undefined };
  if (kpi.status !== KPI_STATUS.SUBMITTED) return { ok: false, message: "Only a Submitted request can be edited." };

  const achievement = achievementPct(d.target, d.actual);
  const updated = await db.kpi.update({
    where: { id: kpi.id },
    data: { name: d.name, target: d.target, actual: d.actual, weight: d.weight, remarks: d.remarks, achievement, calculatedScore: calculatedScore(achievement), currentVersion: kpi.currentVersion + 1 },
  });
  const changes = diffKpi(kpi, updated);
  await db.$transaction([
    db.kpiVersion.create({ data: { kpiId: kpi.id, versionNo: updated.currentVersion, action: "EDIT", snapshot: snapshotOf(updated), changes: JSON.stringify(changes), reason: d.reason, changedById: user.id } }),
    db.reviewDecision.create({ data: { kpiId: kpi.id, reviewerId: user.id, decision: "EDIT", reason: d.reason } }),
  ]);
  await audit(user.id, "KPI_REQUEST_EDITED", "Kpi", kpi.id, { changes, reason: d.reason });
  revalidateAll(kpi.id);
  return { ok: true, message: `Request "${updated.name}" updated (version ${updated.currentVersion}).` };
}

/* FR-REV-07 / FR-AUD-05 — Delete with reason; record kept in version history */
export async function deleteKpiRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) return invalid(formData, { reason: "A reason is required to delete a request." });
  const { user, kpi, error } = await loadForDecision(String(formData.get("kpiId")));
  if (!kpi) return { ok: false, message: error ?? undefined };

  const updated = await db.kpi.update({
    where: { id: kpi.id },
    data: { deletedAt: new Date(), deleteReason: reason, currentVersion: kpi.currentVersion + 1 },
  });
  await db.$transaction([
    db.kpiVersion.create({ data: { kpiId: kpi.id, versionNo: updated.currentVersion, action: "DELETE", snapshot: snapshotOf(updated), changes: JSON.stringify([{ field: "deleted", oldValue: null, newValue: "yes" }]), reason, changedById: user.id } }),
    db.reviewDecision.create({ data: { kpiId: kpi.id, reviewerId: user.id, decision: "DELETE", reason } }),
  ]);
  await audit(user.id, "KPI_DELETED", "Kpi", kpi.id, { reason });
  revalidateAll(kpi.id);
  return { ok: true, message: `Deleted "${kpi.name}". It remains in version history.` };
}

