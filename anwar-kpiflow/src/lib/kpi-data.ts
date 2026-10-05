import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { ROLES } from "./constants";
import type { PeriodRange } from "./calc";
import {
  KPI_STATUS, STAGE_STATUSES, canActOn, canSeePayment, canViewKpi, isPastDept, isScored, reviewStagesFor,
  type KpiHistoryItem, type KpiStage, type KpiStatus, type KpiView,
} from "./kpi";

/** Reads for the KPI screens. Every KPI leaves this file as a KpiView already trimmed to what the viewer may see. */

export type Viewer = { id: string; role: string; departmentId: string | null };

export const kpiInclude = {
  owner: { include: { department: true, businessUnit: true } },
  approver: { select: { id: true, fullName: true } },
  tasks: { orderBy: { sl: "asc" as const } },
  evidence: { omit: { data: true }, orderBy: { createdAt: "asc" as const } },
  decisions: { include: { reviewer: { select: { fullName: true } } }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.KpiInclude;

export type KpiRecord = Prisma.KpiGetPayload<{ include: typeof kpiInclude }>;

/** Reasons the employee is meant to read: why it came back to them, why it was adjusted or rejected. */
const OWNER_VISIBLE_REASONS = new Set(["DEPT_RETURN", "DEPT_REJECT", "DEPT_ADJUST"]);

export function toView(k: KpiRecord, viewer: Viewer): KpiView {
  const own = k.ownerId === viewer.id;
  const showDept = !own || isPastDept(k.status);
  const showHr = !own || isScored(k.status);
  const showPayment = !own && canSeePayment(viewer);
  const internal = !own; // reviewers see every note and reason; the employee only what concerns them
  return {
    id: k.id,
    status: k.status as KpiStatus,
    periodYear: k.periodYear,
    periodMonth: k.periodMonth,
    owner: {
      id: k.owner.id, fullName: k.owner.fullName, employeeId: k.owner.employeeId, designation: k.owner.designation,
      department: k.owner.department?.name ?? null, departmentId: k.owner.departmentId, businessUnit: k.owner.businessUnit?.name ?? null, role: k.owner.role,
    },
    approver: k.approver,
    // Until the Department Head has approved, the employee keeps seeing the scores they entered themselves.
    tasks: k.tasks.map((t) => ({ sl: t.sl, task: t.task, score: showDept ? t.score : t.employeeScore, employeeScore: t.employeeScore, remarks: t.remarks })),
    selfScore: k.selfScore,
    remarks: k.remarks,
    showDept,
    kpiScore: showDept ? k.kpiScore : null,
    qualityOfWork: showDept ? k.qualityOfWork : null,
    timelineOfDeliverables: showDept ? k.timelineOfDeliverables : null,
    stakeholderPeerReview: showDept ? k.stakeholderPeerReview : null,
    adjusted: showDept && k.adjusted,
    adjustReason: showDept ? k.adjustReason : null,
    showHr,
    attendance: showHr ? k.attendance : null,
    hrRemarks: showHr ? (k.hrRemarks ?? "") : "",
    hrNote: showHr ? (k.hrNote ?? "") : "",
    totalScore: showHr ? k.totalScore : null,
    showPayment,
    paymentAmount: showPayment ? k.paymentAmount : null,
    financeNote: showPayment ? k.financeNote : null,
    auditNote: showPayment ? k.auditNote : null,
    returnRemarks: internal || k.status === KPI_STATUS.RETURNED ? k.returnRemarks : null,
    decisionReason: k.decisionReason,
    submittedAt: k.status === KPI_STATUS.DRAFT ? null : k.submittedAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
    currentVersion: k.currentVersion,
    evidence: k.evidence.map((e) => ({ id: e.id, fileName: e.fileName, size: e.size, sha256: e.sha256, createdAt: e.createdAt.toISOString() })),
    history: k.decisions.map<KpiHistoryItem>((d) => ({
      id: d.id, stage: d.stage as KpiStage, decision: d.decision, by: d.reviewer.fullName, at: d.createdAt.toISOString(),
      reason: internal || OWNER_VISIBLE_REASONS.has(d.decision) ? d.reason : null,
    })),
    deleted: !!k.deletedAt,
  };
}

/** The signed-in person's own KPIs: drafts first, then the newest month. */
export async function myKpis(viewer: Viewer): Promise<KpiView[]> {
  const rows = await db.kpi.findMany({
    where: { ownerId: viewer.id, deletedAt: null },
    include: kpiInclude,
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((k) => toView(k, viewer)).sort((a, b) => Number(b.status === KPI_STATUS.DRAFT) - Number(a.status === KPI_STATUS.DRAFT));
}

/** One KPI for the viewer, or null when it does not exist or is outside their access. Deleted records stay visible to the Super Admin only. */
export async function getKpiView(id: string, viewer: Viewer): Promise<KpiView | null> {
  const k = await db.kpi.findUnique({ where: { id }, include: kpiInclude });
  if (!k || !canViewKpi(viewer, k)) return null;
  if (k.deletedAt && viewer.role !== ROLES.SUPER_ADMIN) return null;
  return toView(k, viewer);
}

/* ---------- Request queues ---------- */

/** Which KPI requests a reviewing role receives at all (before any filter). */
function scopeFor(viewer: Viewer): Prisma.KpiWhereInput | null {
  switch (viewer.role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.HR_ADMIN:
      // Every submitted KPI, from every department.
      return { status: { not: KPI_STATUS.DRAFT } };
    case ROLES.FINANCE_ADMIN:
      // Everything the HR Admin has sent on, including what Finance returned to HR.
      return { status: { in: [KPI_STATUS.HR_APPROVED, KPI_STATUS.RETURNED_TO_HR, KPI_STATUS.RETURNED_TO_FINANCE, KPI_STATUS.FINANCE_APPROVED, KPI_STATUS.COMPLETED] } };
    case ROLES.AUDIT_ADMIN:
      return { status: { in: [KPI_STATUS.FINANCE_APPROVED, KPI_STATUS.RETURNED_TO_FINANCE, KPI_STATUS.COMPLETED] } };
    case ROLES.DEPARTMENT_HEAD:
      return {
        status: { not: KPI_STATUS.DRAFT },
        NOT: { ownerId: viewer.id },
        OR: [{ approverId: viewer.id }, ...(viewer.departmentId ? [{ owner: { departmentId: viewer.departmentId, role: ROLES.EMPLOYEE } }] : [])],
      };
    default:
      return null;
  }
}

/** Statuses that are waiting for this viewer's own decision. */
export function awaitingStatuses(viewer: Viewer): KpiStatus[] {
  return reviewStagesFor(viewer).flatMap((s) => STAGE_STATUSES[s]);
}

export type QueueFilters = { bu: string; dept: string; show: "all" | "pending"; period: PeriodRange | null; q: string };
export type QueueRow = KpiView & { actionable: boolean };

/**
 * The KPI Request list. By default every request the role receives is shown, most recently updated first,
 * with the ones waiting for the viewer's decision on top. Filters narrow by Business Unit, Department and period.
 */
export async function requestQueue(viewer: Viewer, f: QueueFilters): Promise<QueueRow[]> {
  const scope = scopeFor(viewer);
  if (!scope) return [];
  const awaiting = awaitingStatuses(viewer);
  const q = f.q.trim();
  const rows = await db.kpi.findMany({
    where: {
      AND: [
        scope,
        { deletedAt: null },
        f.show === "pending" ? { status: { in: awaiting } } : {},
        f.dept ? { owner: { departmentId: f.dept } } : {},
        f.bu ? { owner: { businessUnitId: f.bu } } : {},
        f.period ? { periodYear: f.period.year, periodMonth: { gte: f.period.fromMonth, lte: f.period.toMonth } } : {},
        q ? { owner: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { employeeId: { contains: q, mode: "insensitive" } }] } } : {},
      ],
    },
    include: kpiInclude,
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  return rows
    .map((k) => ({ ...toView(k, viewer), actionable: canActOn(viewer, k) }))
    .sort((a, b) => Number(b.actionable) - Number(a.actionable));
}

/** Sidebar badge: how many KPI requests are waiting for this person's decision right now. */
export async function pendingRequestCount(viewer: Viewer): Promise<number> {
  const scope = scopeFor(viewer);
  const awaiting = awaitingStatuses(viewer);
  if (!scope || awaiting.length === 0) return 0;
  return db.kpi.count({ where: { AND: [scope, { deletedAt: null, status: { in: awaiting } }] } });
}

export async function filterOptions(): Promise<{ departments: { id: string; name: string }[]; businessUnits: { id: string; name: string }[] }> {
  const [departments, businessUnits] = await Promise.all([
    db.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.businessUnit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { departments, businessUnits };
}
