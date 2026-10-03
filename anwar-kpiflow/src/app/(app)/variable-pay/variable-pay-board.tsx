"use client";

import * as React from "react";
import { useActionState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, HandCoins, Lock, Send, Undo2, UsersRound } from "lucide-react";
import { PageHeader, Card, CardHeader, StatTile, MetricBar, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Drawer, Dialog } from "@/components/ui/modal";
import { Field, Input, Select, Textarea, FormAlert } from "@/components/ui/field";
import { StatusBadge, Pill } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { hrNoteAction, returnEvaluationAction, saveEvaluationAction, setEligibilityAction } from "@/actions/variable-pay";
import type { ActionState } from "@/actions/form";
import { fmtNum } from "@/lib/calc";
import { MONTHS } from "@/lib/constants";
import { cn, fmtDate, fmtDateTime } from "@/lib/utils";
import {
  VP_CRITERIA, VP_MANUAL_CRITERIA, VP_STATUS, VP_TASK_COUNT, VP_TASK_MAX, VP_TOTAL_MAX, vpTotals,
  type VpManualKey, type VpRosterRow, type VpRow,
} from "@/lib/variable-pay";

type Mode = "department" | "hr";

const score = (n: number | null) => (n === null ? "—" : fmtNum(n));
const toNum = (s: string): number | null => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));

function StatusCell({ status }: { status: VpRow["status"] }) {
  return status === VP_STATUS.NOT_STARTED ? <Pill>Not started</Pill> : <StatusBadge status={status} />;
}

export function VariablePayBoard({
  mode, canSwitchScope, rows, roster, year, month, currentYear, periodLabel, future, scopeLabel,
}: {
  mode: Mode;
  canSwitchScope: boolean;
  rows: VpRow[];
  roster: VpRosterRow[];
  year: number;
  month: number;
  currentYear: number;
  periodLabel: string;
  future: boolean;
  scopeLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [rosterOpen, setRosterOpen] = React.useState(false);
  const open = rows.find((r) => r.employeeId === openId) ?? null;

  const go = (patch: Record<string, string>) => {
    const q = new URLSearchParams({ year: String(year), month: String(month), ...(mode === "hr" && canSwitchScope ? { scope: "hr" } : {}), ...patch });
    if (q.get("scope") === "department") q.delete("scope");
    router.push(`${pathname}?${q.toString()}`);
  };

  const count = (s: VpRow["status"]) => rows.filter((r) => r.status === s).length;
  const submitted = rows.filter((r) => r.status === VP_STATUS.SUBMITTED);
  const average = submitted.length ? submitted.reduce((a, r) => a + (r.totalScore ?? 0), 0) / submitted.length : null;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  const exportHref = `/api/variable-pay/export?year=${year}&month=${month}${mode === "hr" ? "&scope=hr" : ""}`;

  return (
    <>
      <PageHeader
        title="Variable Pay"
        subtitle={`${periodLabel} · ${scopeLabel}${mode === "hr" ? " · HR review" : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canSwitchScope && (
              <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5" role="tablist" aria-label="View">
                {(["department", "hr"] as const).map((s) => (
                  <button
                    key={s}
                    role="tab"
                    aria-selected={mode === s}
                    onClick={() => go({ scope: s })}
                    className={cn("h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors", mode === s ? "bg-brand-700 text-white shadow-sm" : "text-ink-700 hover:bg-ink-100")}
                  >
                    {s === "department" ? "My department" : "HR review"}
                  </button>
                ))}
              </div>
            )}
            <Select aria-label="Month" className="h-9 w-[132px]" value={String(month)} onChange={(e) => go({ month: e.target.value })}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
            <Select aria-label="Year" className="h-9 w-[92px]" value={String(year)} onChange={(e) => go({ year: e.target.value })}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {mode === "department" ? (
          <>
            <StatTile label="Eligible employees" value={rows.length} hint="On the Variable Pay list" />
            <StatTile label="Submitted" value={<>{submitted.length}<span className="text-ink-300">/</span>{rows.length}</>} hint="Sent to HR">
              <MetricBar value={rows.length ? submitted.length : null} max={rows.length} caption="submitted" />
            </StatTile>
            <StatTile label="In progress" value={count(VP_STATUS.DRAFT) + count(VP_STATUS.RETURNED)} hint={`${count(VP_STATUS.RETURNED)} returned by HR`} tone={count(VP_STATUS.RETURNED) ? "warn" : "default"} />
            <StatTile label="Not started" value={count(VP_STATUS.NOT_STARTED)} hint="Awaiting evaluation" />
          </>
        ) : (
          <>
            <StatTile label="Submitted" value={submitted.length} hint="Awaiting or holding an HR note" />
            <StatTile label="HR note added" value={<>{submitted.filter((r) => r.hrNote).length}<span className="text-ink-300">/</span>{submitted.length}</>} hint="Submitted evaluations">
              <MetricBar value={submitted.length ? submitted.filter((r) => r.hrNote).length : null} max={submitted.length} caption="with HR note" />
            </StatTile>
            <StatTile label="Returned" value={count(VP_STATUS.RETURNED)} hint="Back with the Department Head" tone={count(VP_STATUS.RETURNED) ? "warn" : "default"} />
            <StatTile label="Departments" value={new Set(rows.map((r) => r.department)).size} hint="With submissions this month" />
          </>
        )}
        <StatTile label="Average Total Score" value={average === null ? "—" : fmtNum(average)} hint="Submitted evaluations">
          <MetricBar value={average} max={VP_TOTAL_MAX} caption={`of ${VP_TOTAL_MAX} points`} tone="band" />
        </StatTile>
      </div>

      <Card className="mb-6">
        <CardHeader title="Score" subtitle="Maximum points per criterion. KPI (5) is the sum of 5 Major Tasks, each scored out of 10." />
        <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {VP_CRITERIA.map((c) => (
            <div key={c.key} className="rounded-xl border border-ink-100 bg-surface px-3.5 py-3">
              <div className="text-[12px] text-ink-500 leading-4 min-h-8">{c.label}</div>
              <div className="mt-1 font-mono tnum text-[18px] font-semibold text-ink-900">{c.max}</div>
            </div>
          ))}
          <div className="rounded-xl border border-ink-200 bg-white px-3.5 py-3">
            <div className="text-[12px] text-ink-500 leading-4 min-h-8">Total Score</div>
            <div className="mt-1 font-mono tnum text-[18px] font-semibold text-ink-900">{VP_TOTAL_MAX}</div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Individual"
          subtitle={`${rows.length} employee${rows.length === 1 ? "" : "s"} · ${periodLabel}`}
          action={
            <div className="flex items-center gap-2">
              {mode === "department" && (
                <Button variant="outline" size="sm" icon={<UsersRound className="h-4 w-4" />} onClick={() => setRosterOpen(true)}>Eligible employees</Button>
              )}
              {rows.length > 0 && (
                <a href={exportHref} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-ink-200 bg-white text-[13px] font-medium text-ink-700 hover:bg-ink-100/60">
                  <Download className="h-4 w-4" /> Export
                </a>
              )}
            </div>
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="h-5 w-5" />}
            title={mode === "hr" ? "No submissions for this month" : "No eligible employees yet"}
            description={
              mode === "hr"
                ? "Department Heads have not submitted any Variable Pay evaluations for this month."
                : "Add the employees in your department who are eligible for Variable Pay, then evaluate them each month."
            }
            action={mode === "department" ? <Button icon={<UsersRound className="h-4 w-4" />} onClick={() => setRosterOpen(true)}>Add eligible employees</Button> : undefined}
          />
        ) : (
          <SheetTable rows={rows} mode={mode} future={future} onOpen={setOpenId} />
        )}
      </Card>

      {open && <EvaluationDrawer key={open.employeeId} row={open} mode={mode} year={year} month={month} periodLabel={periodLabel} future={future} onClose={() => setOpenId(null)} />}
      {rosterOpen && <RosterDialog roster={roster} onClose={() => setRosterOpen(false)} />}
    </>
  );
}

/* ---------- The "Individual" sheet ---------- */

function SheetTable({ rows, mode, future, onOpen }: { rows: VpRow[]; mode: Mode; future: boolean; onOpen: (id: string) => void }) {
  const th = "bg-ink-100/60 text-[11px] font-semibold uppercase tracking-wider text-ink-500 px-3 py-2.5 border-b border-ink-100 whitespace-nowrap text-left";
  const td = "px-3 py-3 border-b border-ink-100 align-middle text-ink-900 text-[13px]";
  const numTd = cn(td, "text-right font-mono tnum");
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full border-collapse min-w-[1760px]">
        <thead>
          <tr>
            <th scope="col" className={th}>SL</th>
            <th scope="col" className={th}>ID</th>
            <th scope="col" className={th}>Name</th>
            <th scope="col" className={th}>DOJ</th>
            <th scope="col" className={cn(th, "text-right")}>Days</th>
            <th scope="col" className={th}>Tenure</th>
            <th scope="col" className={th}>Designation</th>
            <th scope="col" className={th}>Department</th>
            <th scope="col" className={th}>Supervisor</th>
            {VP_CRITERIA.map((c) => (
              <th key={c.key} scope="col" className={cn(th, "text-right")}>
                {c.label}
                <span className="block normal-case tracking-normal font-normal text-ink-400">out of {c.max}</span>
              </th>
            ))}
            <th scope="col" className={cn(th, "text-right")}>
              Total Score
              <span className="block normal-case tracking-normal font-normal text-ink-400">out of {VP_TOTAL_MAX}</span>
            </th>
            <th scope="col" className={th}>Remarks</th>
            <th scope="col" className={th}>HR Note</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={cn(th, "sticky right-0 bg-ink-100 text-right")}><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const editable = mode === "department" && r.status !== VP_STATUS.SUBMITTED && !future;
            const label = !editable ? "View" : r.status === VP_STATUS.NOT_STARTED ? "Evaluate" : r.status === VP_STATUS.RETURNED ? "Correct" : "Continue";
            return (
              <tr key={r.employeeId} className="hover:bg-ink-100/30">
                <td className={cn(td, "text-ink-500 tnum")}>{i + 1}</td>
                <td className={cn(td, "font-mono tnum")}>{r.empCode}</td>
                <td className={cn(td, "font-medium whitespace-nowrap")}>{r.name}</td>
                <td className={cn(td, "whitespace-nowrap")}>{r.doj ? fmtDate(r.doj) : "—"}</td>
                <td className={numTd}>{r.days ?? "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{r.tenure ?? "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{r.designation ?? "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{r.department ?? "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{r.supervisor ?? "—"}</td>
                {VP_CRITERIA.map((c) => <td key={c.key} className={numTd}>{score(r[c.key])}</td>)}
                <td className={cn(numTd, "font-semibold")}>{score(r.totalScore)}</td>
                <td className={cn(td, "max-w-[220px]")}><span className="block truncate text-ink-700" title={r.remarks}>{r.remarks || "—"}</span></td>
                <td className={cn(td, "max-w-[220px]")}><span className="block truncate text-ink-700" title={r.hrNote}>{r.hrNote || "—"}</span></td>
                <td className={td}><StatusCell status={r.status} /></td>
                <td className={cn(td, "sticky right-0 bg-white text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.08)]")}>
                  <Button size="sm" variant={editable ? "primary" : "outline"} onClick={() => onOpen(r.employeeId)}>{label}</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Evaluation drawer ---------- */

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-400">{label}</dt>
      <dd className="text-[13.5px] text-ink-900 truncate">{value ?? "—"}</dd>
    </div>
  );
}

function EvaluationDrawer({
  row, mode, year, month, periodLabel, future, onClose,
}: {
  row: VpRow;
  mode: Mode;
  year: number;
  month: number;
  periodLabel: string;
  future: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [state, act, pending] = useActionState(saveEvaluationAction, null);
  const [confirm, setConfirm] = React.useState(false);
  const [returning, setReturning] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const intentRef = React.useRef<HTMLInputElement>(null);

  const [tasks, setTasks] = React.useState(() => row.tasks.map((t) => ({ task: t.task, score: t.score === null ? "" : String(t.score), remarks: t.remarks })));
  const [scores, setScores] = React.useState<Record<VpManualKey, string>>(() => {
    const o = {} as Record<VpManualKey, string>;
    for (const c of VP_MANUAL_CRITERIA) o[c.key] = row[c.key] === null ? "" : String(row[c.key]);
    return o;
  });
  const [remarks, setRemarks] = React.useState(row.remarks);

  const editable = mode === "department" && row.status !== VP_STATUS.SUBMITTED && !future;
  const manual = {} as Record<VpManualKey, number | null>;
  for (const c of VP_MANUAL_CRITERIA) manual[c.key] = toNum(scores[c.key]);
  const totals = vpTotals(tasks.map((t) => toNum(t.score)), manual);
  const e = state?.errors ?? {};

  React.useEffect(() => {
    if (!state) return;
    setConfirm(false);
    if (state.ok) { toast("success", state.message ?? "Saved."); onClose(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const send = (intent: "draft" | "submit") => {
    if (intentRef.current) intentRef.current.value = intent;
    formRef.current?.requestSubmit();
  };
  const setTask = (i: number, patch: Partial<(typeof tasks)[number]>) => setTasks((s) => s.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <Drawer
      open
      onClose={onClose}
      title={<span className="inline-flex items-center gap-2.5">{row.name} <StatusCell status={row.status} /></span>}
      subtitle={`Variable Pay evaluation · ${periodLabel}`}
      width="max-w-3xl"
      footer={
        editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setConfirm(true)} icon={<Send className="h-4 w-4" />} disabled={pending}>Submit evaluation</Button>
            <Button variant="outline" onClick={() => send("draft")} loading={pending && !confirm}>Save as draft</Button>
            <span className="ml-auto text-[12px] text-ink-400">Submitting locks the evaluation and sends it to HR.</span>
          </div>
        ) : mode === "hr" && row.status === VP_STATUS.SUBMITTED ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<Undo2 className="h-4 w-4" />} onClick={() => setReturning(true)}>Return for correction</Button>
            <span className="ml-auto text-[12px] text-ink-400">Returning unlocks the evaluation for the Department Head.</span>
          </div>
        ) : undefined
      }
    >
      <form ref={formRef} action={act} className="space-y-5" noValidate>
        <input type="hidden" name="employeeId" value={row.employeeId} />
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        <input ref={intentRef} type="hidden" name="intent" defaultValue="draft" />

        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        {row.status === VP_STATUS.RETURNED && row.returnReason && (
          <FormAlert kind="error"><strong className="font-semibold">Returned by HR.</strong> {row.returnReason}</FormAlert>
        )}
        {row.status === VP_STATUS.SUBMITTED && (
          <FormAlert kind="info">
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Submitted{row.submittedAt ? ` on ${fmtDateTime(row.submittedAt)}` : ""}{row.evaluatorName ? ` by ${row.evaluatorName}` : ""}. This record is locked.</span>
          </FormAlert>
        )}
        {future && mode === "department" && <FormAlert kind="info">This month has not started, so it cannot be evaluated yet.</FormAlert>}

        <Card>
          <CardHeader title="Individual" subtitle={row.status === VP_STATUS.SUBMITTED ? "As recorded at submission" : "Days and Tenure are counted to today"} />
          <dl className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3.5">
            <Detail label="ID" value={<span className="font-mono tnum">{row.empCode}</span>} />
            <Detail label="Name" value={row.name} />
            <Detail label="DOJ" value={row.doj ? fmtDate(row.doj) : "—"} />
            <Detail label="Days" value={row.days ?? "—"} />
            <Detail label="Tenure" value={row.tenure} />
            <Detail label="Designation" value={row.designation} />
            <Detail label="Department" value={row.department} />
            <Detail label="Supervisor" value={row.supervisor} />
          </dl>
        </Card>

        <Card>
          <CardHeader title="KPI Score Break Down" subtitle={`${VP_TASK_COUNT} Major Tasks · each scored out of ${VP_TASK_MAX}`} />
          <div className="px-5 pb-5 overflow-x-auto scroll-thin">
            <table className="w-full border-collapse min-w-[600px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  <th scope="col" className="w-10 py-2 pr-2">SL.</th>
                  <th scope="col" className="py-2 pr-3">{VP_TASK_COUNT} Major Tasks</th>
                  <th scope="col" className="w-[150px] py-2 pr-3">Score (Out of {VP_TASK_MAX} for Each)</th>
                  <th scope="col" className="w-[190px] py-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => {
                  const sl = i + 1;
                  return (
                    <tr key={sl} className="align-top border-t border-ink-100">
                      <td className="py-2.5 pr-2 text-ink-500 tnum pt-[18px]">{sl}</td>
                      <td className="py-2.5 pr-3">
                        <Textarea name={`task_${sl}`} aria-label={`Major task ${sl}`} rows={2} className="min-h-[58px] text-[13.5px] leading-5" value={t.task} onChange={(ev) => setTask(i, { task: ev.target.value })} disabled={!editable} invalid={!!e[`task_${sl}`]} placeholder={editable ? "Describe the task" : ""} maxLength={500} />
                        {e[`task_${sl}`] && <p className="mt-1 text-[12px] text-red-600" role="alert">{e[`task_${sl}`]}</p>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Input name={`score_${sl}`} aria-label={`Score for task ${sl}, out of ${VP_TASK_MAX}`} type="number" inputMode="decimal" min={0} max={VP_TASK_MAX} step="0.1" className="font-mono text-right" value={t.score} onChange={(ev) => setTask(i, { score: ev.target.value })} disabled={!editable} invalid={!!e[`score_${sl}`]} />
                        {e[`score_${sl}`] && <p className="mt-1 text-[12px] text-red-600" role="alert">{e[`score_${sl}`]}</p>}
                      </td>
                      <td className="py-2.5">
                        <Input name={`tremarks_${sl}`} aria-label={`Remarks for task ${sl}`} value={t.remarks} onChange={(ev) => setTask(i, { remarks: ev.target.value })} disabled={!editable} maxLength={1000} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink-200">
                  <td />
                  <td className="py-3 pr-3 text-right font-semibold text-ink-900">Total</td>
                  <td className="py-3 pr-3 text-right font-mono tnum font-semibold text-ink-900">{score(totals.kpiScore)} <span className="font-normal text-ink-400">/ {VP_TASK_COUNT * VP_TASK_MAX}</span></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Score" subtitle="KPI (5) is carried from the break down above" />
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-4 items-end">
              <Field label="KPI (5)" hint={`out of ${VP_TASK_COUNT * VP_TASK_MAX}`}>
                <Input aria-label="KPI (5)" className="font-mono text-right" value={totals.kpiScore === null ? "" : String(totals.kpiScore)} disabled readOnly />
              </Field>
              {VP_MANUAL_CRITERIA.map((c) => (
                <Field key={c.key} label={c.label} htmlFor={`vp-${c.key}`} required={editable} error={e[c.key]} hint={`out of ${c.max}`}>
                  <Input id={`vp-${c.key}`} name={c.key} type="number" inputMode="decimal" min={0} max={c.max} step="0.1" className="font-mono text-right" value={scores[c.key]} onChange={(ev) => setScores((s) => ({ ...s, [c.key]: ev.target.value }))} disabled={!editable} invalid={!!e[c.key]} />
                </Field>
              ))}
            </div>
            <div className="rounded-xl border border-ink-100 bg-surface px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3 mb-2.5">
                <span className="text-[12px] font-medium uppercase tracking-wide text-ink-500">Total Score</span>
                <span className="font-mono tnum text-[22px] font-semibold text-ink-900">{score(totals.totalScore)} <span className="text-[13px] font-normal text-ink-400">/ {VP_TOTAL_MAX}</span></span>
              </div>
              <MetricBar value={totals.complete ? totals.totalScore : null} max={VP_TOTAL_MAX} caption={totals.complete ? `of ${VP_TOTAL_MAX} points` : "Running total — some scores are still missing"} tone="band" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5 space-y-4">
            <Field label="Remarks" htmlFor="vp-remarks" error={e.remarks} hint={editable ? "Department Head's remarks on this evaluation" : undefined}>
              <Textarea id="vp-remarks" name="remarks" value={remarks} onChange={(ev) => setRemarks(ev.target.value)} disabled={!editable} invalid={!!e.remarks} maxLength={2000} />
            </Field>
            {!(mode === "hr" && row.status === VP_STATUS.SUBMITTED) && (
              <Field label="HR Note" hint={row.hrNoteMeta ?? "Completed by HR after submission"}>
                <Textarea aria-label="HR Note" value={row.hrNote} disabled readOnly className="min-h-[64px]" />
              </Field>
            )}
          </div>
        </Card>
      </form>

      {mode === "hr" && row.status === VP_STATUS.SUBMITTED && row.evaluationId && <HrNoteForm row={row} />}

      {confirm && (
        <Dialog open onClose={() => setConfirm(false)} title="Submit this evaluation?" description={`${row.name} · ${periodLabel}. After you submit, the evaluation is locked and sent to HR. Only HR can return it for correction.`}>
          <div className="rounded-xl border border-ink-100 bg-surface px-4 py-3 mb-5 flex items-baseline justify-between">
            <span className="text-[13px] text-ink-500">Total Score</span>
            <span className="font-mono tnum text-[18px] font-semibold text-ink-900">{score(totals.totalScore)} / {VP_TOTAL_MAX}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={pending}>Cancel</Button>
            <Button onClick={() => send("submit")} loading={pending} icon={<Send className="h-4 w-4" />}>Submit evaluation</Button>
          </div>
        </Dialog>
      )}
      {returning && row.evaluationId && <ReturnDialog row={row} onClose={() => setReturning(false)} onDone={onClose} />}
    </Drawer>
  );
}

function HrNoteForm({ row }: { row: VpRow }) {
  const toast = useToast();
  const [state, act, pending] = useActionState(hrNoteAction, null);
  const [note, setNote] = React.useState(row.hrNote);
  React.useEffect(() => {
    if (state?.ok) toast("success", state.message ?? "Saved.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <Card className="mt-5">
      <form action={act} className="p-5 space-y-3" noValidate>
        <input type="hidden" name="evaluationId" value={row.evaluationId ?? ""} />
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label="HR Note" htmlFor="vp-hr-note" error={state?.errors?.hrNote} hint={row.hrNoteMeta ? `Last saved by ${row.hrNoteMeta}` : "Visible to the Department Head"}>
          <Textarea id="vp-hr-note" name="hrNote" value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={2000} />
        </Field>
        <div className="flex justify-end"><Button type="submit" loading={pending}>Save HR note</Button></div>
      </form>
    </Card>
  );
}

function ReturnDialog({ row, onClose, onDone }: { row: VpRow; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [state, act, pending] = useActionState(returnEvaluationAction, null);
  React.useEffect(() => {
    if (state?.ok) { toast("success", state.message ?? "Returned."); onDone(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <Dialog open onClose={onClose} title="Return for correction" description={`${row.name}'s evaluation goes back to the Department Head, who can correct and resubmit it.`}>
      <form action={act} className="space-y-4" noValidate>
        <input type="hidden" name="evaluationId" value={row.evaluationId ?? ""} />
        {state?.message && !state.ok && !state.errors?.reason && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label="Reason" htmlFor="vp-return-reason" required error={state?.errors?.reason}>
          <Textarea id="vp-return-reason" name="reason" defaultValue={state?.values?.reason} invalid={!!state?.errors?.reason} placeholder="What needs to be corrected?" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>Return to Department Head</Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------- Eligibility roster ---------- */

function RosterDialog({ roster, onClose }: { roster: VpRosterRow[]; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} width="max-w-3xl" title="Eligible employees" description="Choose which employees in your department are eligible for Variable Pay. DOJ and Supervisor appear on every evaluation.">
      {roster.length === 0 ? (
        <p className="text-[13px] text-ink-500">There are no employees in your department yet.</p>
      ) : (
        <ul className="divide-y divide-ink-100 -mt-1">
          {roster.map((r) => <RosterRow key={r.id} row={r} />)}
        </ul>
      )}
      <div className="flex justify-end mt-5"><Button variant="outline" onClick={onClose}>Done</Button></div>
    </Dialog>
  );
}

function RosterRow({ row }: { row: VpRosterRow }) {
  const toast = useToast();
  const [state, act, pending] = useActionState(setEligibilityAction as (s: ActionState, f: FormData) => Promise<ActionState>, null);
  const [eligible, setEligible] = React.useState(row.eligible);
  const [doj, setDoj] = React.useState(row.doj);
  const [supervisor, setSupervisor] = React.useState(row.supervisor);
  const e = state?.errors ?? {};
  const dirty = eligible !== row.eligible || doj !== row.doj || supervisor !== row.supervisor;
  React.useEffect(() => {
    if (state?.ok) toast("success", state.message ?? "Saved.");
    else if (state?.message && !Object.keys(state.errors ?? {}).length) toast("error", state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <li className="py-3.5">
      <form action={act} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.3fr)_150px_minmax(0,1fr)_auto] gap-3 sm:items-start" noValidate>
        <input type="hidden" name="employeeId" value={row.id} />
        <label className="flex items-start gap-3 min-w-0 cursor-pointer pt-1">
          <input type="checkbox" name="eligible" checked={eligible} onChange={(ev) => setEligible(ev.target.checked)} className="mt-1 h-4 w-4 rounded border-ink-300 accent-[#DE3332]" />
          <span className="min-w-0">
            <span className="block text-[13.5px] font-medium text-ink-900 truncate">{row.name}</span>
            <span className="block text-[12px] text-ink-500 truncate"><span className="font-mono">{row.empCode}</span> · {row.designation ?? "Employee"}</span>
          </span>
        </label>
        <div>
          <Input type="date" name="doj" aria-label={`DOJ for ${row.name}`} value={doj} onChange={(ev) => setDoj(ev.target.value)} invalid={!!e.doj} className="h-9" />
          {e.doj && <p className="mt-1 text-[12px] text-red-600" role="alert">{e.doj}</p>}
        </div>
        <div>
          <Input name="supervisor" aria-label={`Supervisor for ${row.name}`} placeholder="Supervisor" value={supervisor} onChange={(ev) => setSupervisor(ev.target.value)} invalid={!!e.supervisor} className="h-9" maxLength={120} />
          {e.supervisor && <p className="mt-1 text-[12px] text-red-600" role="alert">{e.supervisor}</p>}
        </div>
        <Button type="submit" size="sm" variant={dirty ? "primary" : "outline"} loading={pending} disabled={!dirty} className="h-9">Save</Button>
      </form>
    </li>
  );
}
