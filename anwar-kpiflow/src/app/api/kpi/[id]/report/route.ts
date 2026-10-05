import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fmtNum } from "@/lib/calc";
import { MONTHS } from "@/lib/constants";
import { DECISION_LABELS, KPI_CRITERIA, KPI_SELF_MAX, KPI_TOTAL_MAX, ROUTE_STEPS, STAGE_LABELS, STATUS_HINTS, STATUS_LABELS, routeStates } from "@/lib/kpi";
import { getKpiView } from "@/lib/kpi-data";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const when = (d: Date | string) => new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const n = (v: number | null) => (v === null ? "—" : esc(fmtNum(v)));

/**
 * "Download report": a self-contained printable HTML report of the KPI score sheet.
 * It is built from the same view model as the screen, so it contains exactly what the person downloading it may see
 * (an employee's report never includes the Payment Amount).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const k = await getKpiView(id, user);
  if (!k) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await audit(user.id, "REPORT_DOWNLOADED", "Kpi", k.id);
  const versions = await db.kpiVersion.count({ where: { kpiId: k.id } });

  const period = `${MONTHS[k.periodMonth - 1]} ${k.periodYear}`;
  const states = routeStates(k.status);
  const route = ROUTE_STEPS.map((s, i) => `<span class="step ${states[i]}">${esc(s.label)}</span>`).join('<span class="arrow">→</span>');
  const tasks = k.tasks.map((t) => `<tr><td class="c">${t.sl}</td><td>${esc(t.task) || "—"}</td><td class="r mono">${n(t.score)}</td><td>${esc(t.remarks) || "—"}</td></tr>`).join("");
  const taskTotal = k.kpiScore ?? k.selfScore;
  const strip = KPI_CRITERIA.map((c) => ({ label: c.label, max: c.max, value: c.key === "kpiScore" ? (k.kpiScore ?? (k.showDept ? null : k.selfScore)) : k[c.key] }));
  const history = k.history.map((h) => `<tr><td>${esc(DECISION_LABELS[h.decision] ?? h.decision)}</td><td>${esc(STAGE_LABELS[h.stage])}</td><td>${esc(h.by)}</td><td>${esc(when(h.at))}</td><td>${esc(h.reason ?? "—")}</td></tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>KPI ${esc(period)} · ${esc(k.owner.fullName)}</title>
<style>body{font:14px/1.5 -apple-system,Segoe UI,Inter,sans-serif;color:#18181b;margin:40px;max-width:940px}h1{margin:0 0 4px;font-size:24px}h2{font-size:13px;margin:30px 0 10px;text-transform:uppercase;letter-spacing:.07em;color:#6b6b74}
table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:9px 10px;border:1px solid #dedee3;vertical-align:top}th{background:#fafafb;color:#6b6b74;font-weight:600;font-size:12px}
.mono{font-family:ui-monospace,Menlo,monospace}.r{text-align:right}.c{text-align:center;width:48px}.muted{color:#8a8a93}.total td{font-weight:700;background:#f6f6f8}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;border:1px solid #f7c6c5;background:#fdf3f3;color:#a62423;font-size:12px;font-weight:600;vertical-align:middle}
.strip th{background:#c72c2b;color:#fff;text-align:center;font-size:12px}.strip th.hr{background:#047857}.strip th.total{background:#18181b}.strip td{text-align:center}.strip .max td{border-bottom:0;color:#6b6b74;font-size:12px}
.step{display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid #dedee3;font-size:12px;color:#8a8a93}.step.done{background:#ecfdf5;border-color:#6ee7b7;color:#065f46}.step.current{background:#fffbeb;border-color:#fbbf24;color:#92400e;font-weight:600}.step.returned,.step.rejected{background:#fef2f2;border-color:#fca5a5;color:#b91c1c;font-weight:600}.arrow{margin:0 6px;color:#b1b1b9}
.info td:first-child{width:200px;color:#6b6b74;background:#fafafb}@media print{body{margin:16px}}</style></head><body>
<div class="muted">Anwar KPIFlow · KPI report · generated ${esc(when(new Date()))} (Bangladesh time)</div>
<h1>KPI · ${esc(period)} <span class="badge">${esc(STATUS_LABELS[k.status])}</span></h1>
<div class="muted">${esc(k.owner.fullName)} · ${esc(k.owner.employeeId)} · ${esc(k.owner.department ?? "")} · ${esc(k.owner.businessUnit ?? "")}</div>
<h2>Status routing</h2><div>${route}</div><p class="muted">${esc(STATUS_HINTS[k.status])}</p>
<h2>KPI Score Break Down (${esc(k.owner.employeeId)} ${esc(k.owner.fullName)})</h2>
<table><tr><th class="c">SL.</th><th>5 Major Tasks</th><th class="r" style="width:170px">Score (out of 10 for each task)</th><th style="width:240px">Remarks</th></tr>${tasks}
<tr class="total"><td></td><td class="r">Total</td><td class="r mono">${n(taskTotal)} / ${KPI_SELF_MAX}</td><td></td></tr></table>
${k.adjusted && k.adjustReason ? `<p><b>Adjusted by the Department Head.</b> ${esc(k.adjustReason)}</p>` : ""}
<h2>Month of ${esc(MONTHS[k.periodMonth - 1])} - ${k.periodYear}</h2>
<table class="strip"><tr class="max">${strip.map((s) => `<td>${s.max}</td>`).join("")}<td>${KPI_TOTAL_MAX}</td><td colspan="2"></td></tr>
<tr>${strip.map((s) => `<th>${esc(s.label)}</th>`).join("")}<th class="total">Total Score</th><th class="hr">Remarks</th><th class="hr">HR Note</th></tr>
<tr>${strip.map((s) => `<td class="mono">${n(s.value)}</td>`).join("")}<td class="mono"><b>${n(k.totalScore)}</b></td><td style="text-align:left">${esc(k.hrRemarks) || "—"}</td><td style="text-align:left">${esc(k.hrNote) || "—"}</td></tr></table>
<h2>Details</h2><table class="info">
<tr><td>Employee's Remarks</td><td>${esc(k.remarks) || "—"}</td></tr>
<tr><td>Approval Person</td><td>${esc(k.approver?.fullName ?? "—")}</td></tr>
<tr><td>Submitted</td><td>${k.submittedAt ? esc(when(k.submittedAt)) : "Not submitted"}</td></tr>
${k.showPayment ? `<tr><td>Payment Amount (BDT)</td><td class="mono">${k.paymentAmount === null ? "—" : esc(k.paymentAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td></tr><tr><td>Finance Admin note</td><td>${esc(k.financeNote ?? "—")}</td></tr><tr><td>Audit Admin note</td><td>${esc(k.auditNote ?? "—")}</td></tr>` : ""}
<tr><td>Evidence Report</td><td>${k.evidence.map((e) => `${esc(e.fileName)}<br><span class="muted mono">sha256:${esc(e.sha256)} · ${e.size} bytes</span>`).join("<br>") || "—"}</td></tr>
<tr><td>Versions</td><td>${versions}</td></tr></table>
<h2>History</h2><table><tr><th>Step</th><th>Stage</th><th>By</th><th>When</th><th>Remarks</th></tr>${history || '<tr><td colspan="5">—</td></tr>'}</table>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="KPI-report-${encodeURIComponent(`${k.owner.employeeId}-${period}`.replace(/\s+/g, "-"))}-v${k.currentVersion}.html"`,
      "Cache-Control": "private, no-store",
    },
  });
}
