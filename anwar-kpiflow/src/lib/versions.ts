import type { Kpi } from "@prisma/client";

export type FieldChange = { field: string; oldValue: string | number | null; newValue: string | number | null };

export const TRACKED_FIELDS: (keyof Kpi)[] = [
  "name", "category", "periodYear", "periodMonth", "target", "actual", "unit", "weight",
  "achievement", "calculatedScore", "finalScore", "status", "remarks", "approverId", "returnRemarks",
];

export const FIELD_LABELS: Record<string, string> = {
  name: "KPI",
  category: "KPI Category",
  periodYear: "Period year",
  periodMonth: "Period month",
  target: "Target",
  actual: "Actual",
  unit: "Unit",
  weight: "KPI Weight",
  achievement: "Achievement",
  calculatedScore: "Calculated Score",
  finalScore: "Final Score",
  status: "KPI Status",
  remarks: "Remarks",
  approverId: "Approval Person",
  returnRemarks: "Return remarks",
  evidence: "Evidence Report",
};

export function diffKpi(before: Partial<Kpi>, after: Partial<Kpi>): FieldChange[] {
  const out: FieldChange[] = [];
  for (const f of TRACKED_FIELDS) {
    const a = before[f] as string | number | null | undefined;
    const b = after[f] as string | number | null | undefined;
    if ((a ?? null) !== (b ?? null)) out.push({ field: f, oldValue: a ?? null, newValue: b ?? null });
  }
  return out;
}

export function snapshotOf(k: Kpi): string {
  const { id, createdAt, updatedAt, ...rest } = k;
  void id; void createdAt; void updatedAt;
  return JSON.stringify(rest);
}
