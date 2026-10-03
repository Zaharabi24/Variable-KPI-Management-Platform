import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { MONTHS } from "@/lib/constants";
import { VP_CRITERIA, VP_STATUS, VP_STATUS_LABELS, VP_TASK_COUNT, VP_TASK_MAX, VP_TOTAL_MAX } from "@/lib/variable-pay";
import { departmentSheet, requestList, resolveVpView } from "@/lib/variable-pay-data";

/** CSV cell: quoted, and neutralised against spreadsheet formula injection. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const line = (cells: unknown[]) => cells.map(cell).join(",");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "2-digit" }).replace(/ /g, "-") : "");
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

/**
 * Export Variable Pay in the organisation's sheet layout: the Individual table, then each KPI Score Break Down.
 * Uses the same access rules and filters as the screen (department month sheet, review list or finance list).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const view = resolveVpView(user, Object.fromEntries(new URL(req.url).searchParams));
  if (!view.mode) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { mode, year, month, filters } = view;
  const rows = mode === "department" ? (await departmentSheet(user.departmentId!, user.fullName, year, month)).rows : await requestList(mode, filters);

  const title = mode === "department" ? `Month of ${MONTHS[month - 1]},${year}` : mode === "review" ? "All Variable Pay requests" : "Approved Variable Pay — payment history";
  const out: string[] = [
    line(["Individual", ...Array(8).fill(""), title]),
    line([...Array(8).fill(""), "Score =", ...VP_CRITERIA.map((c) => c.max), VP_TOTAL_MAX]),
    line([
      "SL", "ID", "Name", "DOJ", "Days", "Tenure", "Designation", "Department", "Supervisor", ...VP_CRITERIA.map((c) => c.label), "Total Score:", "Remarks", "HR Note",
      "Month", "Business Unit", "Status", "Submitted on", "Submitted by", "Decision by", "Decision on", "Decision comment", "Payment amount (BDT)", "Payment reference", "Payment confirmed by", "Payment confirmed on",
    ]),
    ...rows.map((r, i) =>
      line([
        i + 1, r.empCode, r.name, day(r.doj), r.days, r.tenure, r.designation, r.department, r.supervisor,
        ...VP_CRITERIA.map((c) => r[c.key]), r.totalScore, r.remarks, r.hrNote,
        `${MONTHS[r.periodMonth - 1]} ${r.periodYear}`, r.businessUnit, VP_STATUS_LABELS[r.status], when(r.submittedAt), r.submittedAt ? r.evaluatorName : "",
        r.decidedBy, when(r.decidedAt), r.decisionComment, r.paymentAmount, r.paymentReference, r.paymentConfirmedBy, when(r.paymentConfirmedAt),
      ]),
    ),
  ];
  for (const r of rows.filter((x) => x.status !== VP_STATUS.NOT_STARTED)) {
    out.push("", line([`KPI Score Break Down — ${r.name} (${r.empCode}) — ${MONTHS[r.periodMonth - 1]} ${r.periodYear}`]), line(["SL.", `${VP_TASK_COUNT} Major Tasks`, `Score (Out of ${VP_TASK_MAX} for Each)`, "Remarks"]));
    for (const t of r.tasks) out.push(line([t.sl, t.task, t.score, t.remarks]));
    out.push(line(["", "Total", r.kpiScore, ""]));
  }

  await audit(user.id, "VARIABLE_PAY_EXPORTED", "VariablePayEvaluation", null, { mode, year, month, filters, rows: rows.length });
  const name = mode === "department" ? `variable-pay-${year}-${String(month).padStart(2, "0")}.csv` : `variable-pay-${mode === "review" ? "requests" : "payments"}.csv`;
  return new NextResponse("﻿" + out.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
