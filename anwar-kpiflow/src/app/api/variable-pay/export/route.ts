import { NextResponse } from "next/server";
import { getCurrentUser, isDeptHead } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { MONTHS } from "@/lib/constants";
import { VP_CRITERIA, VP_STATUS, VP_TASK_COUNT, VP_TASK_MAX, VP_TOTAL_MAX, isHrReviewer, todayBd } from "@/lib/variable-pay";
import { departmentSheet, hrSheet } from "@/lib/variable-pay-data";

/** CSV cell: quoted, and neutralised against spreadsheet formula injection. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const line = (cells: unknown[]) => cells.map(cell).join(",");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "2-digit" }).replace(/ /g, "-") : "");

/** Export the month's Variable Pay sheet in the organisation's format: the Individual table, then each KPI Score Break Down. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const hr = isHrReviewer(user);
  const head = isDeptHead(user) && !!user.departmentId;
  if (!hr && !head) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = new URL(req.url).searchParams;
  const today = todayBd();
  const y = Number(q.get("year"));
  const m = Number(q.get("month"));
  const year = y >= 2000 && y <= 2100 ? y : today.getUTCFullYear();
  const month = m >= 1 && m <= 12 ? m : today.getUTCMonth() + 1;
  const mode = hr && (!head || q.get("scope") === "hr") ? "hr" : "department";
  const rows = mode === "hr" ? await hrSheet(year, month) : (await departmentSheet(user.departmentId!, user.fullName, year, month)).rows;

  const pad = Array(9).fill("");
  const out: string[] = [
    line(["Individual", ...Array(8).fill(""), `Month of ${MONTHS[month - 1]},${year}`]),
    line([...pad.slice(0, 8), "Score =", ...VP_CRITERIA.map((c) => c.max), VP_TOTAL_MAX]),
    line(["SL", "ID", "Name", "DOJ", "Days", "Tenure", "Designation", "Department", "Supervisor", ...VP_CRITERIA.map((c) => c.label), "Total Score:", "Remarks", "HR Note", "Status"]),
    ...rows.map((r, i) =>
      line([
        i + 1, r.empCode, r.name, day(r.doj), r.days, r.tenure, r.designation, r.department, r.supervisor,
        ...VP_CRITERIA.map((c) => r[c.key]), r.totalScore, r.remarks, r.hrNote,
        r.status === VP_STATUS.NOT_STARTED ? "Not started" : r.status.charAt(0) + r.status.slice(1).toLowerCase(),
      ]),
    ),
  ];
  for (const r of rows.filter((x) => x.status !== VP_STATUS.NOT_STARTED)) {
    out.push("", line([`KPI Score Break Down — ${r.name} (${r.empCode})`]), line(["SL.", `${VP_TASK_COUNT} Major Tasks`, `Score (Out of ${VP_TASK_MAX} for Each)`, "Remarks"]));
    for (const t of r.tasks) out.push(line([t.sl, t.task, t.score, t.remarks]));
    out.push(line(["", "Total", r.kpiScore, ""]));
  }

  await audit(user.id, "VARIABLE_PAY_EXPORTED", "VariablePayEvaluation", null, { year, month, mode, rows: rows.length });
  const name = `variable-pay-${year}-${String(month).padStart(2, "0")}${mode === "hr" ? "-all-departments" : ""}.csv`;
  return new NextResponse("﻿" + out.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
