/* eslint-disable no-console */
import { randomUUID } from "node:crypto";
import type { Kpi, KpiTask, PrismaClient } from "@prisma/client";
import { DEPT_CRITERIA, KPI_STATUS, round2, sumTasks, totalScore, type KpiStage, type KpiStatus } from "../src/lib/kpi";
import { diffKpi, flatKpi } from "../src/lib/versions";

/**
 * Demo KPI score sheets. Each sheet is walked through the approval chain in memory, with the same rules the
 * workflow uses (lib/kpi.ts) and the same version/decision records, then everything is written in four bulk
 * inserts. Shared by the full seed and by the script that moves an existing database to the score-sheet model.
 * Assumes the demo users already exist.
 */

const TASKS: Record<string, string[]> = {
  GA: ["Sales Order Preparing", "Invoice Preparing", "Tally Data Management", "Support to Sales Return", "Field Force Coordination"],
  HR: ["Recruitment & Onboarding", "Payroll Input Preparation", "Attendance & Leave Records", "Training Coordination", "Employee Query Handling"],
  MKT: ["Campaign Planning & Execution", "Dealer Event Management", "Content & Creative Delivery", "Market Visit Reporting", "Brand Compliance Check"],
  HEAD: ["Department Target Delivery", "Team KPI Reviews Completed", "Budget & Cost Control", "Cross-Department Coordination", "Process Improvement Initiatives"],
};

/** Small deterministic generator so every seed produces the same figures. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

type Person = { id: string; employeeId: string; departmentId: string | null; department: { code: string } | null };
type Sheet = Omit<Kpi, "createdAt" | "updatedAt"> & { createdAt: Date; updatedAt: Date; tasks: KpiTask[] };

export async function seedDemoSheets(db: PrismaClient) {
  const one = (role: string) => db.user.findFirst({ where: { status: "ACTIVE", role } });
  const [admin, hr, finance, auditor] = await Promise.all([one("SUPER_ADMIN"), one("HR_ADMIN"), one("FINANCE_ADMIN"), one("AUDIT_ADMIN")]);
  if (!admin || !hr || !finance || !auditor) throw new Error("Demo sheets need an active Super Admin, HR Admin, Finance Admin and Audit Admin.");

  const heads: Person[] = await db.user.findMany({ where: { role: "DEPARTMENT_HEAD", status: "ACTIVE" }, include: { department: true }, orderBy: { employeeId: "asc" } });
  const employees: Person[] = await db.user.findMany({ where: { role: "EMPLOYEE", status: "ACTIVE", department: { code: { in: ["GA", "HR", "MKT"] } } }, include: { department: true }, orderBy: { employeeId: "asc" } });
  const headOf = (deptId: string | null) => heads.find((h) => h.departmentId === deptId) ?? null;

  const today = new Date(Date.now() + 6 * 3600 * 1000);
  /** n months before the current month. */
  const back = (n: number) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - n, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  };

  const sheets: Sheet[] = [];
  const versions: { kpiId: string; versionNo: number; action: string; snapshot: string; changes: string; reason: string | null; changedById: string; createdAt: Date }[] = [];
  const decisions: { kpiId: string; reviewerId: string; stage: string; decision: string; reason: string | null; createdAt: Date }[] = [];

  function build(owner: Person, approverId: string, period: { year: number; month: number }, target: KpiStatus, taskKey: string) {
    const rand = rng(`${owner.employeeId}-${period.year}-${period.month}`);
    const id = randomUUID();
    // Steps happen two days apart from the first day of the following month, never in the future.
    const start = Date.UTC(period.year, period.month, 1, 4, 0, 0);
    let stepNo = 0;
    const when = () => new Date(Math.min(Date.now() - (12 - stepNo) * 600000, start + stepNo * 2 * 86400000 + stepNo * 5400000));
    const draft = target === KPI_STATUS.DRAFT;

    const tasks: KpiTask[] = TASKS[taskKey].map((task, i) => {
      // A draft is half-filled on purpose: three of the five tasks scored.
      const score = draft && i >= 3 ? null : round2(8.4 + rand() * 1.59);
      return { id: randomUUID(), kpiId: id, sl: i + 1, task, employeeScore: score, score, remarks: "" };
    });
    const created = draft ? new Date(Date.now() - 86400000) : when();
    const s: Sheet = {
      id, periodYear: period.year, periodMonth: period.month, status: KPI_STATUS.DRAFT,
      remarks: `Summary of ${TASKS[taskKey][0].toLowerCase()} and the other major tasks for the month.`,
      selfScore: sumTasks(tasks.map((t) => t.score)),
      kpiScore: null, qualityOfWork: null, timelineOfDeliverables: null, stakeholderPeerReview: null, adjusted: false, adjustReason: null,
      attendance: null, hrRemarks: null, hrNote: null, paymentAmount: null, totalScore: null, financeNote: null, auditNote: null,
      ownerId: owner.id, approverId, currentVersion: 0, returnRemarks: null, decisionReason: null, submittedAt: created,
      deptDecidedAt: null, deptDecidedById: null, hrDecidedAt: null, hrDecidedById: null, financeDecidedAt: null, financeDecidedById: null, auditDecidedAt: null, auditDecidedById: null,
      deletedAt: null, deleteReason: null, createdAt: created, updatedAt: created, tasks,
    };
    sheets.push(s);
    if (draft) return;

    /** One workflow step: apply the change, bump the version, record what changed and who decided. */
    const step = (action: string, stage: KpiStage, actorId: string, patch: Partial<Sheet> | (() => Partial<Sheet>), reason: string | null = null) => {
      const before = flatKpi(s);
      const at = when();
      // A function patch may change the tasks first (an adjustment) and then return the sheet's own changes.
      Object.assign(s, typeof patch === "function" ? patch() : patch, { currentVersion: s.currentVersion + 1, updatedAt: at });
      versions.push({ kpiId: id, versionNo: s.currentVersion, action, snapshot: JSON.stringify(flatKpi(s)), changes: JSON.stringify(diffKpi(before, flatKpi(s))), reason, changedById: actorId, createdAt: at });
      decisions.push({ kpiId: id, reviewerId: actorId, stage, decision: action, reason, createdAt: at });
      stepNo++;
      return at;
    };

    s.submittedAt = step("SUBMIT", "EMPLOYEE", owner.id, { status: KPI_STATUS.SUBMITTED });
    if (target === KPI_STATUS.SUBMITTED) return;

    if (target === KPI_STATUS.RETURNED) {
      const reason = "Task 3 score looks too high for the delivered output. Please review the scores and add remarks for each task.";
      s.deptDecidedAt = step("DEPT_RETURN", "DEPT", approverId, { status: KPI_STATUS.RETURNED, returnRemarks: reason, deptDecidedById: approverId }, reason);
      return;
    }
    if (target === KPI_STATUS.REJECTED) {
      const reason = "This KPI was submitted for the wrong month. Please create it again for the correct period.";
      s.deptDecidedAt = step("DEPT_REJECT", "DEPT", approverId, { status: KPI_STATUS.REJECTED, decisionReason: reason, deptDecidedById: approverId }, reason);
      return;
    }
    // Roughly one in four approvals carries an adjustment to the employee's breakdown.
    const adjust = rand() < 0.25;
    const adjustReason = adjust ? "Task 2 was delivered late twice in the month, so its score is reduced by 0.4." : null;
    const crit = Object.fromEntries(DEPT_CRITERIA.map((c) => [c.key, round2(c.max * (0.86 + rand() * 0.14))])) as Pick<Sheet, "qualityOfWork" | "timelineOfDeliverables" | "stakeholderPeerReview">;
    s.deptDecidedAt = step(adjust ? "DEPT_ADJUST" : "DEPT_APPROVE", "DEPT", approverId, () => {
      if (adjust) tasks[1].score = round2((tasks[1].score ?? 0) - 0.4);
      return { ...crit, kpiScore: sumTasks(tasks.map((t) => t.score)), status: KPI_STATUS.DEPT_APPROVED, adjusted: adjust, adjustReason, deptDecidedById: approverId };
    }, adjustReason);
    if (target === KPI_STATUS.DEPT_APPROVED) return;

    if (target === KPI_STATUS.RETURNED_TO_HEAD) {
      const reason = "Stakeholder & Peer Review looks low compared with the task scores. Please confirm or revise.";
      s.hrDecidedAt = step("HR_RETURN", "HR", hr!.id, { status: KPI_STATUS.RETURNED_TO_HEAD, returnRemarks: reason, hrDecidedById: hr!.id }, reason);
      return;
    }
    const attendance = round2(8.5 + rand() * 1.5);
    const total = totalScore({ kpiScore: s.kpiScore, qualityOfWork: s.qualityOfWork, timelineOfDeliverables: s.timelineOfDeliverables, stakeholderPeerReview: s.stakeholderPeerReview, attendance }) as number;
    s.hrDecidedAt = step("HR_APPROVE", "HR", hr!.id, {
      attendance, totalScore: total, status: KPI_STATUS.HR_APPROVED, hrDecidedById: hr!.id,
      hrRemarks: rand() < 0.5 ? "Attendance verified against the biometric log." : null,
      hrNote: rand() < 0.35 ? "One approved leave day in the month." : null,
      // Payment follows the score: BDT 5,000 to 15,000, in steps of 500.
      paymentAmount: Math.max(5000, Math.round((5000 + ((total - 80) / 20) * 10000) / 500) * 500),
    });
    if (target === KPI_STATUS.HR_APPROVED) return;

    if (target === KPI_STATUS.RETURNED_TO_HR) {
      const reason = "The Payment Amount does not match the approved slab for this Total Score. Please recheck.";
      s.financeDecidedAt = step("FINANCE_RETURN", "FINANCE", finance!.id, { status: KPI_STATUS.RETURNED_TO_HR, returnRemarks: reason, financeDecidedById: finance!.id }, reason);
      return;
    }
    const financeNote = rand() < 0.4 ? "Included in the monthly payroll batch." : null;
    s.financeDecidedAt = step("FINANCE_APPROVE", "FINANCE", finance!.id, { status: KPI_STATUS.FINANCE_APPROVED, financeNote, financeDecidedById: finance!.id }, financeNote);
    if (target === KPI_STATUS.FINANCE_APPROVED) return;

    if (target === KPI_STATUS.RETURNED_TO_FINANCE) {
      const reason = "Payroll batch reference is missing. Please add it before the audit sign-off.";
      s.auditDecidedAt = step("AUDIT_RETURN", "AUDIT", auditor!.id, { status: KPI_STATUS.RETURNED_TO_FINANCE, returnRemarks: reason, auditDecidedById: auditor!.id }, reason);
      return;
    }
    const auditNote = rand() < 0.3 ? "Verified against payroll and attendance records." : null;
    s.auditDecidedAt = step("AUDIT_APPROVE", "AUDIT", auditor!.id, { status: KPI_STATUS.COMPLETED, auditNote, auditDecidedById: auditor!.id }, auditNote);
  }

  // The latest finished month shows every stage of the chain; older months are completed.
  const LAST_MONTH: KpiStatus[] = [
    KPI_STATUS.SUBMITTED, KPI_STATUS.DEPT_APPROVED, KPI_STATUS.HR_APPROVED, KPI_STATUS.FINANCE_APPROVED, KPI_STATUS.COMPLETED,
    KPI_STATUS.RETURNED, KPI_STATUS.RETURNED_TO_HEAD, KPI_STATUS.RETURNED_TO_HR, KPI_STATUS.RETURNED_TO_FINANCE, KPI_STATUS.SUBMITTED, KPI_STATUS.DEPT_APPROVED, KPI_STATUS.HR_APPROVED,
  ];
  for (const [i, e] of employees.entries()) {
    const head = headOf(e.departmentId);
    if (!head) continue;
    const code = e.department?.code ?? "GA";
    const core = i % 3 === 0; // every third employee has a longer history, for the quarterly and yearly views
    for (const n of core ? [9, 8, 7, 6, 5, 4, 3, 2] : [3, 2]) build(e, head.id, back(n), KPI_STATUS.COMPLETED, code);
    build(e, head.id, back(1), LAST_MONTH[i % LAST_MONTH.length], code);
    if (i % 5 === 0) build(e, head.id, back(0), KPI_STATUS.DRAFT, code);
    else if (i % 5 === 1) build(e, head.id, back(0), KPI_STATUS.SUBMITTED, code);
  }
  // One rejected KPI, so the Rejected figures are not empty.
  const rejected = employees.find((e, i) => i % 3 === 1 && headOf(e.departmentId));
  if (rejected) build(rejected, headOf(rejected.departmentId)!.id, back(4), KPI_STATUS.REJECTED, rejected.department?.code ?? "GA");
  // Department Heads submit their own KPI to the Super Admin.
  for (const [i, h] of heads.entries()) {
    build(h, admin.id, back(2), KPI_STATUS.COMPLETED, "HEAD");
    build(h, admin.id, back(1), i % 2 === 0 ? KPI_STATUS.SUBMITTED : KPI_STATUS.HR_APPROVED, "HEAD");
  }

  await db.kpi.createMany({ data: sheets.map(({ tasks: _tasks, ...k }) => { void _tasks; return k; }) });
  await db.kpiTask.createMany({ data: sheets.flatMap((s) => s.tasks) });
  await db.kpiVersion.createMany({ data: versions });
  await db.reviewDecision.createMany({ data: decisions });
  console.log(`${sheets.length} demo KPI sheets created (${versions.length} workflow steps).`);
  return sheets.length;
}
