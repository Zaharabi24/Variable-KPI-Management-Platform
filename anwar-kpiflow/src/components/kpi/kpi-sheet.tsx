"use client";

import * as React from "react";
import { Download, FileText, Lock } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/field";
import { Pill } from "@/components/ui/badge";
import { RouteTracker } from "@/components/ui/tracker";
import { fmtNum } from "@/lib/calc";
import { MONTHS, ROLE_LABELS, type Role } from "@/lib/constants";
import { cn, fmtBytes, fmtDateTime } from "@/lib/utils";
import {
  DECISION_LABELS, KPI_CRITERIA, KPI_SELF_MAX, KPI_TASK_COUNT, KPI_TASK_MAX, KPI_TOTAL_MAX, STAGE_LABELS, partialSum, sumTasks, totalScore,
  type KpiCriterionKey, type KpiView,
} from "@/lib/kpi";

/**
 * The KPI score sheet, shared by every role:
 *   BreakdownCard   "KPI Score Break Down": 5 Major Tasks, each scored out of 10
 *   ScoreStrip      KPI (5) · Quality of work · Time Line of Deliverables · Stakeholder & Peer Review · Attendance · Total Score, then Remarks and HR Note
 * Which cells can be typed in depends on who is looking and where the KPI is in the approval chain.
 * The state lives in useKpiSheet so the two cards (and the form around them) stay in step.
 */

const toNum = (s: string): number | null => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));
const show = (n: number | null) => (n === null ? "—" : fmtNum(n));

type TaskState = { task: string; score: string; remarks: string };
type CritState = Record<Exclude<KpiCriterionKey, "kpiScore">, string>;
type HrState = { hrRemarks: string; hrNote: string; paymentAmount: string };

export function useKpiSheet(kpi: KpiView | null, echo?: Record<string, string>) {
  const [tasks, setTasks] = React.useState<TaskState[]>(() =>
    Array.from({ length: KPI_TASK_COUNT }, (_, i) => {
      const t = kpi?.tasks.find((x) => x.sl === i + 1);
      return {
        task: echo?.[`task_${i + 1}`] ?? t?.task ?? "",
        score: echo?.[`score_${i + 1}`] ?? (t?.score === null || t?.score === undefined ? "" : String(t.score)),
        remarks: echo?.[`tremarks_${i + 1}`] ?? t?.remarks ?? "",
      };
    }),
  );
  const s = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  const [crit, setCrit] = React.useState<CritState>(() => ({
    qualityOfWork: echo?.qualityOfWork ?? s(kpi?.qualityOfWork),
    timelineOfDeliverables: echo?.timelineOfDeliverables ?? s(kpi?.timelineOfDeliverables),
    stakeholderPeerReview: echo?.stakeholderPeerReview ?? s(kpi?.stakeholderPeerReview),
    attendance: echo?.attendance ?? s(kpi?.attendance),
  }));
  const [hr, setHr] = React.useState<HrState>(() => ({
    hrRemarks: echo?.hrRemarks ?? kpi?.hrRemarks ?? "",
    hrNote: echo?.hrNote ?? kpi?.hrNote ?? "",
    paymentAmount: echo?.paymentAmount ?? s(kpi?.paymentAmount),
  }));

  const scores = tasks.map((t) => toNum(t.score));
  const kpiScore = sumTasks(scores);
  const values: Record<KpiCriterionKey, number | null> = {
    kpiScore,
    qualityOfWork: toNum(crit.qualityOfWork),
    timelineOfDeliverables: toNum(crit.timelineOfDeliverables),
    stakeholderPeerReview: toNum(crit.stakeholderPeerReview),
    attendance: toNum(crit.attendance),
  };
  // "Changed" is measured against what the employee submitted.
  const changed = !!kpi && tasks.some((t, i) => {
    const base = kpi.tasks.find((x) => x.sl === i + 1);
    return t.task.trim() !== (base?.task ?? "") || toNum(t.score) !== (base?.employeeScore ?? null);
  });

  return {
    tasks,
    setTask: (i: number, patch: Partial<TaskState>) => setTasks((list) => list.map((t, j) => (j === i ? { ...t, ...patch } : t))),
    /** Put back the tasks and scores exactly as the employee submitted them (remarks are kept). */
    resetTasks: () => setTasks((list) => list.map((t, i) => {
      const base = kpi?.tasks.find((x) => x.sl === i + 1);
      return base ? { ...t, task: base.task, score: base.employeeScore === null ? "" : String(base.employeeScore) } : t;
    })),
    /** Task numbers whose text or score differs from the employee's submission. */
    changedTasks: kpi ? tasks.flatMap((t, i) => {
      const base = kpi.tasks.find((x) => x.sl === i + 1);
      return t.task.trim() !== (base?.task ?? "") || toNum(t.score) !== (base?.employeeScore ?? null) ? [i + 1] : [];
    }) : [],
    crit,
    setCrit: (key: keyof CritState, value: string) => setCrit((c) => ({ ...c, [key]: value })),
    hr,
    setHr: (key: keyof HrState, value: string) => setHr((h) => ({ ...h, [key]: value })),
    scores,
    kpiScore,
    runningKpi: partialSum(scores),
    values,
    total: totalScore(values),
    runningTotal: partialSum(Object.values(values)),
    changed,
    tasksComplete: tasks.every((t) => t.task.trim().length >= 2) && kpiScore !== null && scores.every((n) => n !== null && n >= 0 && n <= KPI_TASK_MAX),
  };
}
export type KpiSheetState = ReturnType<typeof useKpiSheet>;

/* ---------- KPI Score Break Down ---------- */

export function BreakdownCard({
  sheet, ownerLabel, editable, errors = {}, baseline,
}: {
  sheet: KpiSheetState;
  /** e.g. "016810 Soham" */
  ownerLabel: string;
  editable: boolean;
  errors?: Record<string, string>;
  /** The employee's own scores, shown under a score a reviewer has changed. */
  baseline?: (number | null)[];
}) {
  const th = "bg-[#fafafb] border-y border-ink-100 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500 text-left";
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={<>KPI Score Break Down <span className="font-normal text-ink-500">({ownerLabel})</span></>}
        subtitle={`${KPI_TASK_COUNT} Major Tasks · each scored out of ${KPI_TASK_MAX}`}
        action={<Pill tone="brand">KPI (5) · out of {KPI_SELF_MAX}</Pill>}
      />
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th scope="col" className={cn(th, "w-14 pl-5")}>SL.</th>
              <th scope="col" className={th}>{KPI_TASK_COUNT} Major Tasks</th>
              <th scope="col" className={cn(th, "w-[168px] text-right")}>Score <span className="normal-case tracking-normal font-normal text-ink-400">(out of {KPI_TASK_MAX} for each task)</span></th>
              <th scope="col" className={cn(th, "w-[230px] pr-5")}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {sheet.tasks.map((t, i) => {
              const sl = i + 1;
              const base = baseline?.[i];
              const differs = base !== undefined && base !== null && toNum(t.score) !== base;
              return (
                <tr key={sl} className="align-top border-b border-ink-100">
                  <td className="pl-5 pr-3 py-3 text-ink-500 tnum pt-[18px]">{sl}</td>
                  <td className="px-3 py-3">
                    {editable ? (
                      <>
                        <Input name={`task_${sl}`} aria-label={`Major task ${sl}`} value={t.task} onChange={(ev) => sheet.setTask(i, { task: ev.target.value })} invalid={!!errors[`task_${sl}`]} placeholder="Describe the task" maxLength={200} />
                        {errors[`task_${sl}`] && <p className="mt-1 text-[12px] text-red-600" role="alert">{errors[`task_${sl}`]}</p>}
                      </>
                    ) : (
                      <div className="py-2 text-ink-900 font-medium break-words">{t.task || <span className="text-ink-400 font-normal">—</span>}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {editable ? (
                      <>
                        <Input name={`score_${sl}`} aria-label={`Score for task ${sl}, out of ${KPI_TASK_MAX}`} type="number" inputMode="decimal" min={0} max={KPI_TASK_MAX} step="0.01" className="font-mono text-right" value={t.score} onChange={(ev) => sheet.setTask(i, { score: ev.target.value })} invalid={!!errors[`score_${sl}`]} placeholder="0.00" />
                        {errors[`score_${sl}`] && <p className="mt-1 text-[12px] text-red-600 text-left" role="alert">{errors[`score_${sl}`]}</p>}
                      </>
                    ) : (
                      <div className="py-2 font-mono tnum text-ink-900">{show(toNum(t.score))}</div>
                    )}
                    {differs && <p className="mt-1 text-[11.5px] text-amber-700 tnum">Employee entered {fmtNum(base)}</p>}
                  </td>
                  <td className="pl-3 pr-5 py-3">
                    {editable ? (
                      <Input name={`tremarks_${sl}`} aria-label={`Remarks for task ${sl}`} value={t.remarks} onChange={(ev) => sheet.setTask(i, { remarks: ev.target.value })} invalid={!!errors[`tremarks_${sl}`]} maxLength={500} />
                    ) : (
                      <div className="py-2 text-ink-700 break-words">{t.remarks || <span className="text-ink-400">—</span>}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface">
              <td className="pl-5" />
              <td className="px-3 py-3.5 text-right text-[13px] font-semibold uppercase tracking-[0.05em] text-ink-700">Total</td>
              <td className="px-3 py-3.5 text-right font-mono tnum text-[16px] font-semibold text-ink-900" aria-live="polite">
                {show(sheet.kpiScore ?? sheet.runningKpi)} <span className="text-[12.5px] font-normal text-ink-400">/ {KPI_SELF_MAX}</span>
              </td>
              <td className="pr-5 text-[12px] text-ink-400">{sheet.kpiScore === null && sheet.runningKpi !== null ? "Running total" : ""}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

/* ---------- Score strip ---------- */

type StripMode = { dept: boolean; hr: boolean };

export function ScoreStrip({
  sheet, periodLabel, edit, visible, errors = {}, payment, pendingNote,
}: {
  sheet: KpiSheetState;
  /** "Month of July - 2026" */
  periodLabel: string;
  /** Which cells accept input. */
  edit: StripMode;
  /** Which values the viewer may see at all (the employee sees them only after each stage approves). */
  visible: StripMode;
  errors?: Record<string, string>;
  /** Payment Amount is rendered only for HR, Finance, Audit and the Super Admin. */
  payment?: { editable: boolean };
  /** Shown under the strip while nothing in it is available yet. */
  pendingNote?: string;
}) {
  const total = sheet.total;
  const cell = (c: (typeof KPI_CRITERIA)[number]) => {
    const key = c.key;
    const canSee = c.by === "HR" ? visible.hr : visible.dept;
    const canEdit = key !== "kpiScore" && (c.by === "HR" ? edit.hr : edit.dept);
    const value = sheet.values[key];
    return (
      <div key={key} className="flex flex-col min-w-0">
        <div className="text-center font-mono tnum text-[12.5px] text-ink-500 pb-1.5">{c.max}</div>
        <div className="rounded-t-lg bg-gradient-to-b from-brand-600 to-brand-700 px-2 py-2 text-center text-[12px] font-semibold leading-4 text-white min-h-[48px] flex items-center justify-center">{c.label}</div>
        <div className={cn("rounded-b-lg border border-t-0 px-2 py-2 min-h-[58px] flex flex-col items-center justify-center", errors[key] ? "border-red-300 bg-red-50/40" : "border-ink-200 bg-white")}>
          {canEdit ? (
            <Input
              id={`kpi-${key}`} name={key} aria-label={`${c.label}, out of ${c.max}`} type="number" inputMode="decimal" min={0} max={c.max} step="0.01"
              className="h-9 font-mono text-center px-1.5" value={sheet.crit[key as keyof CritState]} onChange={(ev) => sheet.setCrit(key as keyof CritState, ev.target.value)} invalid={!!errors[key]} placeholder="0.00"
            />
          ) : (
            <span className={cn("font-mono tnum text-[15px]", canSee && value !== null ? "text-ink-900 font-semibold" : "text-ink-400")}>{canSee ? show(key === "kpiScore" ? (value ?? sheet.runningKpi) : value) : "—"}</span>
          )}
        </div>
        {errors[key] && <p className="mt-1 text-[11.5px] text-red-600 text-center" role="alert">{errors[key]}</p>}
      </div>
    );
  };
  const hrText = (key: "hrRemarks" | "hrNote", label: string) => (
    <div className="flex flex-col min-w-0">
      <div className="rounded-t-lg bg-gradient-to-b from-emerald-600 to-emerald-700 px-3 py-2 text-center text-[12px] font-semibold text-white">{label}</div>
      <div className={cn("rounded-b-lg border border-t-0 flex-1", errors[key] ? "border-red-300" : "border-ink-200", edit.hr ? "bg-white p-1.5" : "bg-white px-3 py-2.5 min-h-[58px]")}>
        {edit.hr ? (
          <Textarea name={key} aria-label={label} value={sheet.hr[key]} onChange={(ev) => sheet.setHr(key, ev.target.value)} invalid={!!errors[key]} maxLength={2000} className="min-h-[64px] border-0 shadow-none focus:ring-0 px-2 py-1.5 text-[13.5px]" />
        ) : (
          <p className={cn("text-[13.5px] whitespace-pre-wrap break-words", visible.hr && sheet.hr[key] ? "text-ink-900" : "text-ink-400")}>{visible.hr && sheet.hr[key] ? sheet.hr[key] : "—"}</p>
        )}
      </div>
      {errors[key] && <p className="mt-1 text-[11.5px] text-red-600" role="alert">{errors[key]}</p>}
    </div>
  );

  return (
    <Card>
      <div className="px-5 pt-5 pb-1 text-center">
        <h2 className="text-[15.5px] font-semibold text-ink-900">{periodLabel}</h2>
        <p className="text-[12.5px] text-ink-500 mt-0.5">Score · maximum points above each criterion</p>
      </div>
      <div className="px-5 pb-5 pt-3 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-2.5 gap-y-4">
          {KPI_CRITERIA.map(cell)}
          <div className="flex flex-col min-w-0">
            <div className="text-center font-mono tnum text-[12.5px] text-ink-500 pb-1.5">{KPI_TOTAL_MAX}</div>
            <div className="rounded-t-lg bg-gradient-to-b from-ink-900 to-[#27272c] px-2 py-2 text-center text-[12px] font-semibold leading-4 text-white min-h-[48px] flex items-center justify-center">Total Score</div>
            <div className="rounded-b-lg border border-t-0 border-ink-200 bg-surface px-2 py-2 min-h-[58px] flex items-center justify-center" aria-live="polite">
              <span className={cn("font-mono tnum text-[17px] font-semibold", visible.hr && total !== null ? "text-ink-900" : "text-ink-400")}>{visible.hr ? show(total) : "—"}</span>
            </div>
          </div>
        </div>
        {/* Payment Amount comes straight after the Total Score */}
        {payment && (
          <div className={cn("rounded-xl border px-4 py-3.5 flex flex-wrap items-center justify-between gap-3", errors.paymentAmount ? "border-red-300 bg-red-50/40" : payment.editable ? "border-brand-200 bg-brand-50/40" : "border-ink-200 bg-surface")}>
            <div className="min-w-0">
              <label htmlFor="kpi-payment" className="block text-[13.5px] font-semibold text-ink-900">Payment Amount <span className="font-normal text-ink-500">(BDT)</span>{payment.editable && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}</label>
              <p className="text-[12px] text-ink-500 inline-flex items-center gap-1.5"><Lock className="h-3 w-3" /> {payment.editable ? "Entered by HR. It goes with the KPI to the Finance Admin and the Audit Admin; the employee never sees it." : "Entered by HR. Visible to HR, Finance and Audit only; the employee never sees it."}</p>
              {errors.paymentAmount && <p className="mt-1 text-[12px] text-red-600" role="alert">{errors.paymentAmount}</p>}
            </div>
            {payment.editable ? (
              <Input id="kpi-payment" name="paymentAmount" type="number" inputMode="decimal" min={0} step="0.01" className="w-[200px] font-mono text-right" value={sheet.hr.paymentAmount} onChange={(ev) => sheet.setHr("paymentAmount", ev.target.value)} invalid={!!errors.paymentAmount} placeholder="Enter amount" required />
            ) : (
              <span className="font-mono tnum text-[17px] font-semibold text-ink-900">{toNum(sheet.hr.paymentAmount) === null ? "—" : `BDT ${Number(sheet.hr.paymentAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {hrText("hrRemarks", "Remarks")}
          {hrText("hrNote", "HR Note")}
        </div>
        {pendingNote && <p className="text-[12.5px] text-ink-500 inline-flex items-start gap-1.5"><Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {pendingNote}</p>}
      </div>
    </Card>
  );
}

/* ---------- Read-only parts ---------- */

export function EvidenceList({ files }: { files: KpiView["evidence"] }) {
  if (files.length === 0) return <p className="text-[13px] text-ink-400">No evidence file attached.</p>;
  return (
    <ul className="space-y-2">
      {files.map((f) => (
        <li key={f.id}>
          <a href={`/api/evidence/${f.id}`} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 hover:border-ink-300 hover:bg-surface transition-colors">
            <FileText className="h-4.5 w-4.5 text-brand-700 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-ink-900 truncate">{f.fileName}</span>
              <span className="block text-[11.5px] text-ink-400 truncate">{fmtBytes(f.size)} · uploaded {fmtDateTime(f.createdAt)}</span>
            </span>
            <Download className="h-4 w-4 text-ink-400 shrink-0" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-400">{label}</dt>
      <dd className="text-[13.5px] text-ink-900 break-words">{children}</dd>
    </div>
  );
}

/** Who the KPI belongs to and what the employee attached. */
export function SheetMeta({ kpi }: { kpi: KpiView }) {
  return (
    <Card>
      <CardHeader title="Employee" subtitle={`KPI for ${MONTHS[kpi.periodMonth - 1]} ${kpi.periodYear}`} />
      <div className="px-5 pb-5 space-y-4">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3.5">
          <Detail label="ID"><span className="font-mono tnum">{kpi.owner.employeeId}</span></Detail>
          <Detail label="Name">{kpi.owner.fullName}</Detail>
          <Detail label="Designation">{kpi.owner.designation ?? "—"}</Detail>
          <Detail label="Department">{kpi.owner.department ?? "—"}</Detail>
          <Detail label="Business Unit">{kpi.owner.businessUnit ?? "—"}</Detail>
          <Detail label="Approval Person">{kpi.approver?.fullName ?? "—"}</Detail>
          <Detail label="Submitted on">{kpi.submittedAt ? fmtDateTime(kpi.submittedAt) : "Not submitted"}</Detail>
          <Detail label="Version">{kpi.currentVersion > 0 ? `v${kpi.currentVersion}` : "Draft"}</Detail>
        </dl>
        <div>
          <div className="text-[11.5px] text-ink-400 mb-1.5">Evidence Report</div>
          <EvidenceList files={kpi.evidence} />
        </div>
        <div>
          <div className="text-[11.5px] text-ink-400 mb-1">Employee&apos;s Remarks</div>
          <p className={cn("text-[13.5px] whitespace-pre-wrap break-words", kpi.remarks ? "text-ink-900" : "text-ink-400")}>{kpi.remarks || "—"}</p>
        </div>
      </div>
    </Card>
  );
}

export function StatusRouteCard({ kpi }: { kpi: KpiView }) {
  return (
    <Card>
      <CardHeader title="Status routing" subtitle="Submit → Department Head Approval → HR Admin Approval → Finance Admin → Audit Admin" />
      <div className="px-5 pb-5"><RouteTracker status={kpi.status} /></div>
    </Card>
  );
}

export function KpiHistory({ kpi }: { kpi: KpiView }) {
  if (kpi.history.length === 0) return null;
  return (
    <Card>
      <CardHeader title="History" subtitle="Every step of this KPI, oldest first" />
      <ol className="px-5 pb-5 space-y-3.5">
        {kpi.history.map((h) => {
          const bad = h.decision.endsWith("_RETURN") || h.decision.endsWith("_REJECT") || h.decision === "DELETE";
          const good = h.decision.endsWith("_APPROVE") || h.decision.endsWith("_ADJUST");
          return (
            <li key={h.id} className="flex gap-3">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", bad ? "bg-red-500" : good ? "bg-emerald-600" : "bg-ink-300")} aria-hidden />
              <div className="min-w-0">
                <div className="text-[13.5px] text-ink-900"><span className="font-medium">{DECISION_LABELS[h.decision] ?? h.decision}</span> <span className="text-ink-500">by {h.by} · {STAGE_LABELS[h.stage]}</span></div>
                <div className="text-[12px] text-ink-400">{fmtDateTime(h.at)}</div>
                {h.reason && <p className="mt-1 text-[13px] text-ink-700 whitespace-pre-wrap break-words">{h.reason}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export const periodLabelOf = (k: { periodYear: number; periodMonth: number }) => `Month of ${MONTHS[k.periodMonth - 1]} - ${k.periodYear}`;
export const ownerLabelOf = (k: KpiView) => `${k.owner.employeeId} ${k.owner.fullName}`;

/**
 * The whole KPI form, read-only: used on the detail page and for anyone who opens a request they cannot act on.
 * Values the viewer is not yet allowed to see arrive hidden in the view model and render as "—".
 */
export function KpiSheetReadonly({ kpi, hideMeta = false }: { kpi: KpiView; hideMeta?: boolean }) {
  const sheet = useKpiSheet(kpi);
  const pending = !kpi.showDept
    ? "KPI (5), Quality of work, Time Line of Deliverables and Stakeholder & Peer Review appear here once your Department Head approves. Attendance, Remarks, HR Note and the Total Score appear once the HR Admin approves."
    : !kpi.showHr
      ? "Attendance, Remarks, HR Note and the Total Score appear here once the HR Admin approves."
      : undefined;
  return (
    <div className="space-y-5">
      <StatusRouteCard kpi={kpi} />
      {!hideMeta && <SheetMeta kpi={kpi} />}
      <BreakdownCard sheet={sheet} ownerLabel={ownerLabelOf(kpi)} editable={false} baseline={kpi.showDept ? kpi.tasks.map((t) => t.employeeScore) : undefined} />
      {kpi.adjusted && kpi.adjustReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900"><span className="font-semibold">Adjusted by the Department Head.</span> {kpi.adjustReason}</div>
      )}
      <ScoreStrip sheet={sheet} periodLabel={periodLabelOf(kpi)} edit={{ dept: false, hr: false }} visible={{ dept: kpi.showDept, hr: kpi.showHr }} payment={kpi.showPayment ? { editable: false } : undefined} pendingNote={pending} />
      {kpi.showPayment && (kpi.financeNote || kpi.auditNote) && (
        <Card>
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            <Detail label="Finance Admin note">{kpi.financeNote ?? "—"}</Detail>
            <Detail label="Audit Admin note">{kpi.auditNote ?? "—"}</Detail>
          </div>
        </Card>
      )}
      <KpiHistory kpi={kpi} />
    </div>
  );
}

export const roleLabel = (role: string) => ROLE_LABELS[role as Role] ?? role;
