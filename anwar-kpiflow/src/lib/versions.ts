import type { Kpi, KpiTask } from "@prisma/client";
import { KPI_TASK_COUNT } from "./kpi";

export type FieldChange = { field: string; oldValue: string | number | null; newValue: string | number | null };
type Flat = Record<string, string | number | null>;

const SCALARS: (keyof Kpi)[] = [
  "periodYear", "periodMonth", "status", "remarks", "selfScore",
  "kpiScore", "qualityOfWork", "timelineOfDeliverables", "stakeholderPeerReview", "adjustReason",
  "attendance", "hrRemarks", "hrNote", "paymentAmount", "totalScore",
  "financeNote", "auditNote", "approverId", "returnRemarks", "decisionReason",
];

export const FIELD_LABELS: Record<string, string> = {
  periodYear: "Period year",
  periodMonth: "Period month",
  status: "KPI Status",
  remarks: "Remarks",
  selfScore: "Employee's KPI (5)",
  kpiScore: "KPI (5)",
  qualityOfWork: "Quality of work",
  timelineOfDeliverables: "Time Line of Deliverables",
  stakeholderPeerReview: "Stakeholder & Peer Review",
  adjustReason: "Adjustment reason",
  attendance: "Attendance",
  hrRemarks: "HR Remarks",
  hrNote: "HR Note",
  paymentAmount: "Payment Amount",
  totalScore: "Total Score",
  financeNote: "Finance note",
  auditNote: "Audit note",
  approverId: "Approval Person",
  returnRemarks: "Return remarks",
  decisionReason: "Rejection reason",
  evidence: "Evidence Report",
  ...Object.fromEntries(
    Array.from({ length: KPI_TASK_COUNT }, (_, i) => [
      [`task${i + 1}`, `Major Task ${i + 1}`],
      [`task${i + 1}Score`, `Task ${i + 1} score`],
      [`task${i + 1}Remarks`, `Task ${i + 1} remarks`],
    ]).flat(),
  ),
};

/** Fields whose values only HR, Finance, Audit and the Super Admin may read in the version history. */
export const PAYMENT_FIELDS = new Set(["paymentAmount"]);

/** One flat record of everything that is versioned: the sheet's own fields plus the five tasks. */
export function flatKpi(k: Kpi & { tasks: KpiTask[] }): Flat {
  const out: Flat = {};
  for (const f of SCALARS) out[f] = (k[f] as string | number | null | undefined) ?? null;
  for (const t of [...k.tasks].sort((a, b) => a.sl - b.sl)) {
    out[`task${t.sl}`] = t.task;
    out[`task${t.sl}Score`] = t.score;
    out[`task${t.sl}Remarks`] = t.remarks;
  }
  return out;
}

export function diffKpi(before: Flat, after: Flat): FieldChange[] {
  const out: FieldChange[] = [];
  for (const f of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = before[f] ?? null;
    const b = after[f] ?? null;
    if (a !== b && !(a === "" && b === null) && !(a === null && b === "")) out.push({ field: f, oldValue: a, newValue: b });
  }
  return out;
}

export function snapshotOf(k: Kpi & { tasks: KpiTask[] }): string {
  return JSON.stringify(flatKpi(k));
}
