import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, canViewKpi } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fmtNum, fmtPct, formulaText } from "@/lib/calc";
import { CATEGORY_LABELS, MONTHS, STATUS_LABELS, type KpiCategory, type KpiStatus } from "@/lib/constants";
import { FIELD_LABELS } from "@/lib/versions";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const when = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** FR-DET-01 — "Download report": a self-contained printable HTML report of the KPI record. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const k = await db.kpi.findUnique({
    where: { id },
    include: { owner: { include: { department: true, businessUnit: true } }, approver: true, evidence: true, versions: { include: { changedBy: true }, orderBy: { versionNo: "asc" } } },
  });
  if (!k || !canViewKpi(user, k)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await audit(user.id, "REPORT_DOWNLOADED", "Kpi", k.id);

  const rows = (pairs: [string, string][]) => pairs.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${b}</td></tr>`).join("");
  const history = k.versions
    .map((v) => {
      let changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
      try { changes = JSON.parse(v.changes); } catch {}
      const list = changes.filter((c) => c.field !== "approverId").map((c) => `<li>${esc(FIELD_LABELS[c.field] ?? c.field)}: <s>${esc(c.oldValue ?? "—")}</s> → <b>${esc(c.newValue ?? "—")}</b></li>`).join("");
      return `<tr><td>v${v.versionNo}</td><td>${esc(v.action)}</td><td>${esc(v.changedBy.fullName)}</td><td>${esc(when(v.createdAt))}</td><td>${esc(v.reason ?? "—")}</td><td><ul>${list || "<li>—</li>"}</ul></td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(k.name)} · KPI report</title>
<style>body{font:14px/1.5 -apple-system,Segoe UI,Inter,sans-serif;color:#0f1a15;margin:40px;max-width:900px}h1{margin:0 0 4px}h2{font-size:15px;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.06em;color:#5d6b64}
table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e9ede9;vertical-align:top}th{width:220px;color:#5d6b64;font-weight:500}.mono{font-family:ui-monospace,Menlo,monospace}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;border:1px solid #aed5c0;background:#eef6f2;font-size:12px;font-weight:600}.muted{color:#7f8c85}ul{margin:0;padding-left:18px}@media print{body{margin:16px}}</style></head><body>
<div class="muted">Anwar KPIFlow · Variable KPI report · generated ${esc(when(new Date()))} (Bangladesh time)</div>
<h1>${esc(k.name)} <span class="badge">${esc(STATUS_LABELS[k.status as KpiStatus] ?? k.status)}</span></h1>
<div class="muted">${esc(k.owner.fullName)} · ${esc(k.owner.employeeId)} · ${esc(k.owner.department?.name ?? "")} · ${esc(k.owner.businessUnit?.name ?? "")}</div>
<h2>KPI record</h2><table>${rows([
    ["KPI Category", esc(CATEGORY_LABELS[k.category as KpiCategory] ?? k.category)],
    ["KPI Period", esc(`${MONTHS[k.periodMonth - 1]} ${k.periodYear}`)],
    ["Target", `<span class="mono">${esc(fmtNum(k.target))} ${esc(k.unit)}</span>`],
    ["Actual", `<span class="mono">${esc(fmtNum(k.actual))} ${esc(k.unit)}</span>`],
    ["KPI Weight", `<span class="mono">${esc(fmtNum(k.weight))}%</span>`],
    ["Remarks", esc(k.remarks)],
    ["Approval Person", esc(k.approver.fullName)],
    ["Submitted", esc(when(k.submittedAt))],
    ["Decided", k.decidedAt ? esc(when(k.decidedAt)) : "—"],
    ["Decision reason", esc(k.decisionReason ?? "—")],
  ])}</table>
<h2>Calculation path</h2><table>${rows([
    ["Formula", `<span class="mono">${esc(formulaText(k.target, k.actual))}</span>`],
    ["Achievement", `<span class="mono">${esc(fmtPct(k.achievement))}</span>`],
    ["Calculated Score", `<span class="mono">${esc(fmtNum(k.calculatedScore))}</span>`],
    ["Final Score", `<span class="mono">${k.finalScore === null ? "Pending approval" : esc(fmtNum(k.finalScore))}</span>`],
    ["KPI Weight", `<span class="mono">${esc(fmtNum(k.weight))}%</span>`],
  ])}</table>
<h2>Evidence</h2><table>${k.evidence.map((e) => `<tr><th>${esc(e.fileName)}</th><td class="mono">sha256:${esc(e.sha256)}<br><span class="muted">${e.size} bytes · uploaded ${esc(when(e.createdAt))}</span></td></tr>`).join("") || "<tr><td>—</td></tr>"}</table>
<h2>Adjustment history</h2><table><tr><th style="width:auto">Version</th><th style="width:auto">Action</th><th style="width:auto">By</th><th style="width:auto">When</th><th style="width:auto">Reason</th><th style="width:auto">Changes</th></tr>${history}</table>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="KPI-report-${encodeURIComponent(k.name.replace(/\s+/g, "-"))}-v${k.currentVersion}.html"`,
      "Cache-Control": "private, no-store",
    },
  });
}
