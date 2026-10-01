import Link from "next/link";
import { Download, FileText, History as HistoryIcon, User as UserIcon } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Tracker } from "@/components/ui/tracker";
import { fmtNum, fmtPct, formulaText } from "@/lib/calc";
import { CATEGORY_LABELS, MONTHS, type KpiCategory } from "@/lib/constants";
import { FIELD_LABELS, type FieldChange } from "@/lib/versions";
import { fmtDateTime, fmtBytes } from "@/lib/utils";

export type KpiDetailData = {
  id: string;
  name: string;
  category: string;
  weight: number;
  periodYear: number;
  periodMonth: number;
  status: string;
  target: number;
  actual: number;
  unit: string;
  achievement: number;
  calculatedScore: number;
  finalScore: number | null;
  remarks: string;
  dataSource: string;
  returnRemarks: string | null;
  decisionReason: string | null;
  decidedAt: Date | null;
  submittedAt: Date;
  currentVersion: number;
  owner: { fullName: string; employeeId: string; designation: string | null; department: { name: string } | null };
  approver: { fullName: string } | null;
  evidence: { id: string; fileName: string; sha256: string; size: number; createdAt: Date }[];
  versions: { id: string; versionNo: number; action: string; changes: string; reason: string | null; createdAt: Date; changedBy: { fullName: string } }[];
};

export function KpiDetailHeader({ kpi, actions }: { kpi: KpiDetailData; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-semibold tracking-tight text-ink-900">{kpi.name}</h1>
          <StatusBadge status={kpi.status} />
        </div>
        <p className="text-[13.5px] text-ink-500 mt-1">
          {kpi.owner.fullName} · {kpi.owner.employeeId} · {CATEGORY_LABELS[kpi.category as KpiCategory] ?? kpi.category} · weight {fmtNum(kpi.weight)}% · {MONTHS[kpi.periodMonth - 1]} {kpi.periodYear}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <a href={`/api/kpi/${kpi.id}/report`} className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-ink-200 bg-white text-[13px] font-medium text-ink-700 hover:bg-ink-100/60">
          <Download className="h-4 w-4" /> Download report
        </a>
      </div>
    </div>
  );
}

export function KpiDetailBody({ kpi, canDownload = true }: { kpi: KpiDetailData; canDownload?: boolean }) {
  const finalPending = kpi.status === "SUBMITTED" || kpi.status === "RETURNED";
  return (
    <div className="space-y-5">
      <Card className="px-6 py-4">
        <Tracker status={kpi.status} layout="row" />
      </Card>

      {kpi.status === "RETURNED" && kpi.returnRemarks && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-900">
          <span className="font-semibold">Returned by {kpi.approver?.fullName ?? "your approver"}:</span> {kpi.returnRemarks}
        </div>
      )}
      {kpi.status === "REJECTED" && kpi.decisionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-900">
          <span className="font-semibold">Rejected:</span> {kpi.decisionReason}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5 items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Target and actual" subtitle={kpi.remarks} />
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Item label="Target" mono>{fmtNum(kpi.target)} {kpi.unit && <span className="text-ink-400 text-[13px]">{kpi.unit}</span>}</Item>
                <Item label="Latest actual" mono>{fmtNum(kpi.actual)} {kpi.unit && <span className="text-ink-400 text-[13px]">{kpi.unit}</span>}</Item>
                <Item label="Data source" mono>{kpi.dataSource}</Item>
                <Item label="Reviewer / approver">{kpi.approver?.fullName ?? "Not selected yet"}</Item>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Evidence" subtitle={`${kpi.evidence.length} file${kpi.evidence.length === 1 ? "" : "s"} · each with an integrity fingerprint`} />
            <CardBody className="space-y-3">
              {kpi.evidence.map((f) => (
                <div key={f.id} className="rounded-xl bg-surface border border-ink-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4.5 w-4.5 text-brand-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-medium text-ink-900 truncate">{f.fileName}</div>
                        <div className="text-[11.5px] text-ink-400">{fmtBytes(f.size)} · uploaded {fmtDateTime(f.createdAt)}</div>
                      </div>
                    </div>
                    {canDownload && (
                      <a href={`/api/evidence/${f.id}`} className="text-[13px] font-medium text-brand-700 hover:underline shrink-0">Download</a>
                    )}
                  </div>
                  <div className="mt-2.5 font-mono text-[11px] text-ink-500 break-all">sha256:{f.sha256}</div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Calculation path" subtitle="No curve or cap is applied in Phase 01." />
            <CardBody>
              <dl className="divide-y divide-ink-100">
                <Row label="Formula"><span className="font-mono text-[12.5px]">{formulaText(kpi.target, kpi.actual)}</span></Row>
                <Row label="Achievement"><span className="font-mono tnum">{fmtPct(kpi.achievement)}</span></Row>
                <Row label="Calculated score"><span className="font-mono tnum">{fmtNum(kpi.calculatedScore)}</span></Row>
                <Row label="Final score">
                  {finalPending ? (
                    <StatusBadge status="SUBMITTED" label={kpi.status === "RETURNED" ? "Awaiting resubmission" : "Pending approval"} />
                  ) : kpi.status === "REJECTED" ? (
                    <StatusBadge status="REJECTED" label="Rejected · not scored" />
                  ) : (
                    <span className="font-mono tnum font-semibold text-brand-800">{fmtNum(kpi.finalScore)}</span>
                  )}
                </Row>
                <Row label="KPI weight"><span className="font-mono tnum">{fmtNum(kpi.weight)}%</span></Row>
              </dl>
            </CardBody>
          </Card>

          <AdjustmentHistory versions={kpi.versions} />
        </div>
      </div>
    </div>
  );
}

function Item({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-400">{label}</dt>
      <dd className={mono ? "font-mono tnum text-[16px] text-ink-900 mt-0.5" : "text-[15px] text-ink-900 mt-0.5"}>{children}</dd>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="text-[14px] text-ink-900 text-right">{children}</dd>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  SUBMIT: "Submitted", RESUBMIT: "Resubmitted", APPROVE: "Approved", ADJUST: "Adjusted", RETURN: "Returned to employee", REJECT: "Rejected", EDIT: "Request edited", DELETE: "Deleted",
};

function fmtVal(field: string, v: string | number | null): string {
  if (v === null || v === undefined) return "—";
  if (field === "status") return String(v).charAt(0) + String(v).slice(1).toLowerCase();
  if (field === "category") return CATEGORY_LABELS[v as KpiCategory] ?? String(v);
  if (field === "periodMonth") return MONTHS[Number(v) - 1] ?? String(v);
  if (field === "periodYear") return String(v);
  if (typeof v === "number") return fmtNum(v);
  return String(v);
}

/** FR-DET-07 / FR-AUD-02 — every change: what, old, new, who, when, why. */
export function AdjustmentHistory({ versions, title = "Adjustment History" }: { versions: KpiDetailData["versions"]; title?: string }) {
  const entries = [...versions].sort((a, b) => b.versionNo - a.versionNo);
  return (
    <Card>
      <CardHeader title={title} subtitle="Every version is kept; nothing is overwritten." action={<HistoryIcon className="h-4.5 w-4.5 text-ink-400" />} />
      <CardBody>
        <ol className="space-y-4">
          {entries.map((v) => {
            const changes = safeParse(v.changes).filter((c) => c.field !== "approverId");
            return (
              <li key={v.id} className="relative pl-6 border-l-2 border-ink-100">
                <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-white" aria-hidden />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="text-[13.5px] font-semibold text-ink-900">
                    v{v.versionNo} · {ACTION_LABEL[v.action] ?? v.action}
                  </div>
                  <div className="text-[12px] text-ink-400 tnum">{fmtDateTime(v.createdAt)}</div>
                </div>
                <div className="text-[12.5px] text-ink-500 flex items-center gap-1.5 mt-0.5">
                  <UserIcon className="h-3.5 w-3.5" /> {v.changedBy.fullName}
                </div>
                {v.reason && <p className="mt-1.5 text-[13px] text-ink-700 bg-surface border border-ink-100 rounded-lg px-3 py-2"><span className="font-medium">Reason:</span> {v.reason}</p>}
                {changes.length > 0 && (
                  <table className="mt-2 w-full text-[12.5px]">
                    <thead>
                      <tr className="text-[10.5px] uppercase tracking-wider text-ink-400">
                        <th className="text-left font-semibold pb-1 pr-3">Field</th>
                        <th className="text-left font-semibold pb-1 pr-3">Before</th>
                        <th className="text-left font-semibold pb-1">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((c, i) => (
                        <tr key={i} className="border-t border-ink-100">
                          <td className="py-1.5 pr-3 text-ink-500 whitespace-nowrap">{FIELD_LABELS[c.field] ?? c.field}</td>
                          <td className="py-1.5 pr-3 font-mono tnum text-ink-500">{fmtVal(c.field, c.oldValue)}</td>
                          <td className="py-1.5 font-mono tnum text-ink-900 font-semibold">{fmtVal(c.field, c.newValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}

function safeParse(s: string): FieldChange[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900 mb-3">← {label}</Link>
  );
}
