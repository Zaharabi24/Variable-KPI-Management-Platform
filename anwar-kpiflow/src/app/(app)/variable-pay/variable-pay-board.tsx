"use client";

import * as React from "react";
import { useActionState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeDollarSign, Download, HandCoins, Lock, Search, Send, Undo2, UsersRound, X } from "lucide-react";
import { PageHeader, Card, CardHeader, StatTile, MetricBar, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Drawer, Dialog } from "@/components/ui/modal";
import { Field, Input, Select, Textarea, FormAlert } from "@/components/ui/field";
import { StatusBadge, Pill } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { confirmPaymentAction, decideEvaluationAction, hrNoteAction, saveEvaluationAction, setEligibilityAction } from "@/actions/variable-pay";
import { fmtNum } from "@/lib/calc";
import { MONTHS, MONTHS_SHORT } from "@/lib/constants";
import { cn, fmtDate, fmtDateTime } from "@/lib/utils";
import {
  VP_CRITERIA, VP_EDITABLE, VP_EVENT_LABELS, VP_FINANCE_STATUSES, VP_MANUAL_CRITERIA, VP_REVIEW_STATUSES, VP_STATUS, VP_STATUS_LABELS,
  VP_TASK_COUNT, VP_TASK_MAX, VP_TOTAL_MAX, vpTotals,
  type VpFilters, type VpManualKey, type VpMode, type VpOption, type VpRosterRow, type VpRow, type VpStatus,
} from "@/lib/variable-pay";

type Caps = { decide: boolean; hrNote: boolean; pay: boolean };
type Decision = "approve" | "return" | "reject";

const score = (n: number | null) => (n === null ? "—" : fmtNum(n));
const money = (n: number | null) => (n === null ? "—" : `BDT ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const toNum = (s: string): number | null => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));
const periodOf = (r: VpRow) => `${MONTHS_SHORT[r.periodMonth - 1]} ${r.periodYear}`;

const SCOPE_LABELS: Record<VpMode, string> = { department: "My department", review: "All requests", finance: "Payments" };

/** Status always carries its word; colour only reinforces it. */
function StatusCell({ status }: { status: VpStatus }) {
  const label = VP_STATUS_LABELS[status];
  if (status === VP_STATUS.NOT_STARTED) return <Pill>{label}</Pill>;
  if (status === VP_STATUS.PAYMENT_CONFIRMED) return <StatusBadge status="ADJUSTED" label={label} />;
  return <StatusBadge status={status} label={label} />;
}

export function VariablePayBoard({
  mode, scopes, rows, roster, year, month, currentYear, periodLabel, future, departmentName, filters, options, caps, viewerId,
}: {
  mode: VpMode;
  scopes: VpMode[];
  rows: VpRow[];
  roster: VpRosterRow[];
  year: number;
  month: number;
  currentYear: number;
  periodLabel: string;
  future: boolean;
  departmentName: string;
  filters: VpFilters;
  options: { departments: VpOption[]; businessUnits: VpOption[] };
  caps: Caps;
  viewerId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [rosterOpen, setRosterOpen] = React.useState(false);
  const open = rows.find((r) => r.key === openKey) ?? null;
  const list = mode !== "department";

  const go = (patch: Record<string, string>, reset = false) => {
    const q = reset ? new URLSearchParams() : new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  };

  const count = (...s: VpStatus[]) => rows.filter((r) => s.includes(r.status)).length;
  const scored = rows.filter((r) => r.totalScore !== null && r.status !== VP_STATUS.DRAFT && r.status !== VP_STATUS.NOT_STARTED);
  const average = scored.length ? scored.reduce((a, r) => a + (r.totalScore ?? 0), 0) / scored.length : null;
  const sentCount = rows.length - count(VP_STATUS.NOT_STARTED, VP_STATUS.DRAFT, VP_STATUS.RETURNED);
  const paidTotal = rows.reduce((a, r) => a + (r.paymentAmount ?? 0), 0);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  const activeFilters = Object.values(filters).some(Boolean);
  const exportQuery = new URLSearchParams(sp.toString());
  exportQuery.set("scope", mode);
  const statusOptions = mode === "finance" ? VP_FINANCE_STATUSES : VP_REVIEW_STATUSES;

  const subtitle =
    mode === "department"
      ? `${periodLabel} · ${departmentName}`
      : mode === "review"
        ? `${caps.decide ? "Review, approve, return or reject requests" : "HR review"} · all departments${activeFilters ? " · filtered" : " · all requests"}`
        : `Approved by the Super Admin · confirm the payment amount${activeFilters ? " · filtered" : " · all approved requests"}`;

  return (
    <>
      <PageHeader
        title="Variable Pay"
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {scopes.length > 1 && (
              <div className="seg" role="tablist" aria-label="View">
                {scopes.map((s) => (
                  <button
                    key={s}
                    role="tab"
                    aria-selected={mode === s}
                    onClick={() => go({ scope: s }, true)}
                    className={cn("seg-item", mode === s && "seg-item-active")}
                  >
                    {SCOPE_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
            {!list && (
              <>
                <Select aria-label="Month" className="h-9 w-[132px]" value={String(month)} onChange={(e) => go({ month: e.target.value, year: String(year) })}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </Select>
                <Select aria-label="Year" className="h-9 w-[92px]" value={String(year)} onChange={(e) => go({ year: e.target.value, month: String(month) })}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </Select>
              </>
            )}
          </div>
        }
      />

      {list && (
        <Card className="mb-6">
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-[1fr_1fr_170px_150px_150px_auto] gap-3 items-end">
            <Field label="Department" htmlFor="vp-f-dept">
              <Select id="vp-f-dept" value={filters.dept} onChange={(e) => go({ dept: e.target.value })}>
                <option value="">All departments</option>
                {options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Business Unit" htmlFor="vp-f-bu">
              <Select id="vp-f-bu" value={filters.bu} onChange={(e) => go({ bu: e.target.value })}>
                <option value="">All business units</option>
                {options.businessUnits.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Status" htmlFor="vp-f-status">
              <Select id="vp-f-status" value={filters.status} onChange={(e) => go({ status: e.target.value })}>
                <option value="">All statuses</option>
                {statusOptions.map((s) => <option key={s} value={s}>{VP_STATUS_LABELS[s]}</option>)}
              </Select>
            </Field>
            <Field label="Submitted from" htmlFor="vp-f-from">
              <Input id="vp-f-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => go({ from: e.target.value })} />
            </Field>
            <Field label="Submitted to" htmlFor="vp-f-to">
              <Input id="vp-f-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => go({ to: e.target.value })} />
            </Field>
            <Button variant="ghost" icon={<X className="h-4 w-4" />} disabled={!activeFilters} onClick={() => go({ scope: scopes.length > 1 ? mode : "" }, true)}>Clear</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {mode === "department" && (
          <>
            <StatTile label="Eligible employees" value={rows.length} hint="On the Variable Pay list" />
            <StatTile label="Submitted" value={<>{sentCount}<span className="text-ink-300">/</span>{rows.length}</>} hint={`${count(VP_STATUS.SUBMITTED)} waiting for the Super Admin`}>
              <MetricBar value={rows.length ? sentCount : null} max={rows.length} caption="submitted" />
            </StatTile>
            <StatTile label="Returned" value={count(VP_STATUS.RETURNED)} hint="Needs your correction" tone={count(VP_STATUS.RETURNED) ? "warn" : "default"} />
            <StatTile label="Approved" value={count(VP_STATUS.APPROVED, VP_STATUS.PAYMENT_CONFIRMED)} hint={`${count(VP_STATUS.PAYMENT_CONFIRMED)} payment confirmed · ${count(VP_STATUS.REJECTED)} rejected`} />
          </>
        )}
        {mode === "review" && (
          <>
            <StatTile label="Awaiting review" value={count(VP_STATUS.SUBMITTED)} hint="Submitted by Department Heads" tone={count(VP_STATUS.SUBMITTED) ? "warn" : "default"} />
            <StatTile label="Approved" value={count(VP_STATUS.APPROVED)} hint="With the Finance Admin for payment" />
            <StatTile label="Returned" value={count(VP_STATUS.RETURNED)} hint="Back with the Department Head" />
            <StatTile label="Payment confirmed" value={count(VP_STATUS.PAYMENT_CONFIRMED)} hint={`${count(VP_STATUS.REJECTED)} rejected`} />
          </>
        )}
        {mode === "finance" && (
          <>
            <StatTile label="Awaiting payment" value={count(VP_STATUS.APPROVED)} hint="Approved by the Super Admin" tone={count(VP_STATUS.APPROVED) ? "warn" : "default"} />
            <StatTile label="Payment confirmed" value={count(VP_STATUS.PAYMENT_CONFIRMED)} hint="Completed requests" />
            <StatTile label="Total confirmed" value={<span className="text-[20px]">{money(paidTotal)}</span>} hint="Sum of confirmed payments" />
            <StatTile label="Requests" value={rows.length} hint={activeFilters ? "Matching the filters" : "All approved requests"} />
          </>
        )}
        <StatTile label="Average Total Score" value={average === null ? "—" : fmtNum(average)} hint="Submitted requests">
          <MetricBar value={average} max={VP_TOTAL_MAX} caption={`of ${VP_TOTAL_MAX} points`} tone="band" />
        </StatTile>
      </div>

      {mode === "department" && (
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
      )}

      <Card>
        <CardHeader
          title={mode === "department" ? "Individual" : mode === "review" ? "Variable Pay requests" : "Approved Variable Pay"}
          subtitle={mode === "department" ? `${rows.length} employee${rows.length === 1 ? "" : "s"} · ${periodLabel}` : `${rows.length} request${rows.length === 1 ? "" : "s"} · requests waiting for you first, then newest submission`}
          action={
            <div className="flex items-center gap-2">
              {mode === "department" && (
                <Button variant="outline" size="sm" icon={<UsersRound className="h-4 w-4" />} onClick={() => setRosterOpen(true)}>Eligible employees</Button>
              )}
              {rows.length > 0 && (
                <a href={`/api/variable-pay/export?${exportQuery.toString()}`} className="btn-outline h-8 px-3 text-[13px]">
                  <Download className="h-4 w-4" /> Export
                </a>
              )}
            </div>
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="h-5 w-5" />}
            title={mode === "department" ? "No eligible employees yet" : activeFilters ? "No requests match these filters" : mode === "review" ? "No Variable Pay requests yet" : "Nothing approved yet"}
            description={
              mode === "department"
                ? "Add the employees in your department who are eligible for Variable Pay, then evaluate them each month."
                : activeFilters
                  ? "Change or clear the filters to see more requests."
                  : mode === "review"
                    ? "Requests appear here as soon as a Department Head submits one."
                    : "Requests arrive here automatically as soon as the Super Admin approves them."
            }
            action={mode === "department" ? <Button icon={<UsersRound className="h-4 w-4" />} onClick={() => setRosterOpen(true)}>Add eligible employees</Button> : undefined}
          />
        ) : (
          <SheetTable rows={rows} mode={mode} caps={caps} future={future} onOpen={setOpenKey} />
        )}
      </Card>

      {open && <RequestDrawer key={open.key} row={open} mode={mode} caps={caps} viewerId={viewerId} future={future} onClose={() => setOpenKey(null)} />}
      {rosterOpen && <RosterDialog roster={roster} onClose={() => setRosterOpen(false)} />}
    </>
  );
}

/* ---------- The "Individual" sheet ---------- */

function SheetTable({ rows, mode, caps, future, onOpen }: { rows: VpRow[]; mode: VpMode; caps: Caps; future: boolean; onOpen: (key: string) => void }) {
  const list = mode !== "department";
  const showPayment = list || rows.some((r) => r.paymentAmount !== null);
  const th = "bg-[#fafafb] text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500 px-3 py-3 border-y border-ink-100 whitespace-nowrap text-left";
  const td = "px-3 py-3 border-b border-ink-100 align-middle text-ink-900 text-[13px]";
  const numTd = cn(td, "text-right font-mono tnum");
  const nowrap = cn(td, "whitespace-nowrap");
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className={cn("w-full border-collapse", list ? "min-w-[2240px]" : "min-w-[1900px]")}>
        <thead>
          <tr>
            <th scope="col" className={th}>SL</th>
            {list && <th scope="col" className={th}>Month</th>}
            {list && <th scope="col" className={th}>Business Unit</th>}
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
            <th scope="col" className={th}>Submitted on</th>
            {showPayment && <th scope="col" className={cn(th, "text-right")}>Payment amount</th>}
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={cn(th, "sticky right-0 bg-[#fafafb] text-right")}><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const editable = mode === "department" && (r.status === VP_STATUS.NOT_STARTED || VP_EDITABLE.includes(r.status)) && !future;
            const actionable = editable || (caps.decide && r.status === VP_STATUS.SUBMITTED) || (caps.pay && r.status === VP_STATUS.APPROVED);
            const label = editable
              ? r.status === VP_STATUS.NOT_STARTED ? "Evaluate" : r.status === VP_STATUS.RETURNED ? "Correct" : "Continue"
              : caps.decide && r.status === VP_STATUS.SUBMITTED ? "Review" : caps.pay && r.status === VP_STATUS.APPROVED ? "Confirm payment" : "View";
            return (
              <tr key={r.key} className="hover:bg-ink-100/30">
                <td className={cn(td, "text-ink-500 tnum")}>{i + 1}</td>
                {list && <td className={nowrap}>{periodOf(r)}</td>}
                {list && <td className={nowrap}>{r.businessUnit ?? "—"}</td>}
                <td className={cn(td, "font-mono tnum")}>{r.empCode}</td>
                <td className={cn(nowrap, "font-medium")}>{r.name}</td>
                <td className={nowrap}>{r.doj ? fmtDate(r.doj) : "—"}</td>
                <td className={numTd}>{r.days ?? "—"}</td>
                <td className={nowrap}>{r.tenure ?? "—"}</td>
                <td className={nowrap}>{r.designation ?? "—"}</td>
                <td className={nowrap}>{r.department ?? "—"}</td>
                <td className={nowrap}>{r.supervisor ?? "—"}</td>
                {VP_CRITERIA.map((c) => <td key={c.key} className={numTd}>{score(r[c.key])}</td>)}
                <td className={cn(numTd, "font-semibold")}>{score(r.totalScore)}</td>
                <td className={cn(td, "max-w-[200px]")}><span className="block truncate text-ink-700" title={r.remarks}>{r.remarks || "—"}</span></td>
                <td className={cn(td, "max-w-[200px]")}><span className="block truncate text-ink-700" title={r.hrNote}>{r.hrNote || "—"}</span></td>
                <td className={nowrap}>{r.submittedAt ? fmtDateTime(r.submittedAt) : "—"}</td>
                {showPayment && <td className={cn(numTd, "whitespace-nowrap")}>{money(r.paymentAmount)}</td>}
                <td className={td}><StatusCell status={r.status} /></td>
                <td className={cn(td, "sticky right-0 bg-white text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.08)]")}>
                  <Button size="sm" variant={actionable ? "primary" : "outline"} onClick={() => onOpen(r.key)}>{label}</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Request drawer ---------- */

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-400">{label}</dt>
      <dd className="text-[13.5px] text-ink-900 truncate">{value ?? "—"}</dd>
    </div>
  );
}

function RequestDrawer({ row, mode, caps, viewerId, future, onClose }: { row: VpRow; mode: VpMode; caps: Caps; viewerId: string; future: boolean; onClose: () => void }) {
  const toast = useToast();
  const [state, act, pending] = useActionState(saveEvaluationAction, null);
  const [confirm, setConfirm] = React.useState(false);
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const intentRef = React.useRef<HTMLInputElement>(null);
  const topRef = React.useRef<HTMLDivElement>(null);

  const [tasks, setTasks] = React.useState(() => row.tasks.map((t) => ({ task: t.task, score: t.score === null ? "" : String(t.score), remarks: t.remarks })));
  const [scores, setScores] = React.useState<Record<VpManualKey, string>>(() => {
    const o = {} as Record<VpManualKey, string>;
    for (const c of VP_MANUAL_CRITERIA) o[c.key] = row[c.key] === null ? "" : String(row[c.key]);
    return o;
  });
  const [remarks, setRemarks] = React.useState(row.remarks);

  const editable = mode === "department" && (row.status === VP_STATUS.NOT_STARTED || VP_EDITABLE.includes(row.status)) && !future;
  const canDecide = caps.decide && row.status === VP_STATUS.SUBMITTED;
  const canHrNote = caps.hrNote && (row.status === VP_STATUS.SUBMITTED || row.status === VP_STATUS.APPROVED);
  const canPay = caps.pay && row.status === VP_STATUS.APPROVED;
  const periodLabel = `Month of ${MONTHS[row.periodMonth - 1]}, ${row.periodYear}`;
  const manual = {} as Record<VpManualKey, number | null>;
  for (const c of VP_MANUAL_CRITERIA) manual[c.key] = toNum(scores[c.key]);
  const totals = vpTotals(tasks.map((t) => toNum(t.score)), manual);
  const e = state?.errors ?? {};

  React.useEffect(() => {
    if (!state) return;
    setConfirm(false);
    if (state.ok) { toast("success", state.message ?? "Saved."); onClose(); }
    else {
      // Make a failed save impossible to miss: toast it and bring the message into view.
      toast("error", state.message ?? "Nothing was saved. Please check the form.");
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
      subtitle={`Variable Pay · ${periodLabel}${row.department ? ` · ${row.department}` : ""}`}
      width="max-w-3xl"
      footer={
        editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setConfirm(true)} icon={<Send className="h-4 w-4" />} disabled={pending}>{row.status === VP_STATUS.RETURNED ? "Resubmit request" : "Submit request"}</Button>
            <Button variant="outline" onClick={() => send("draft")} loading={pending && !confirm}>Save as draft</Button>
            <span className="ml-auto text-[12px] text-ink-400">Submitting locks the request and sends it to the Super Admin.</span>
          </div>
        ) : canDecide ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setDecision("approve")}>Approve</Button>
            <Button variant="outline" icon={<Undo2 className="h-4 w-4" />} onClick={() => setDecision("return")}>Return for correction</Button>
            <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" onClick={() => setDecision("reject")}>Reject</Button>
            <span className="ml-auto text-[12px] text-ink-400">Return and Reject require a comment.</span>
          </div>
        ) : undefined
      }
    >
      <div ref={topRef} />
      <form ref={formRef} action={act} className="space-y-5" noValidate>
        <input type="hidden" name="employeeId" value={row.employeeId} />
        <input type="hidden" name="year" value={row.periodYear} />
        <input type="hidden" name="month" value={row.periodMonth} />
        <input ref={intentRef} type="hidden" name="intent" defaultValue="draft" />

        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        {row.status === VP_STATUS.RETURNED && (
          <FormAlert kind="error">
            <strong className="font-semibold">Returned for correction{row.decidedBy ? ` by ${row.decidedBy}` : ""}{row.decidedAt ? ` on ${fmtDateTime(row.decidedAt)}` : ""}.</strong>{" "}
            {row.returnReason ?? row.decisionComment}
          </FormAlert>
        )}
        {row.status === VP_STATUS.REJECTED && (
          <FormAlert kind="error">
            <strong className="font-semibold">Rejected{row.decidedBy ? ` by ${row.decidedBy}` : ""}{row.decidedAt ? ` on ${fmtDateTime(row.decidedAt)}` : ""}.</strong> {row.decisionComment} This request is closed.
          </FormAlert>
        )}
        {row.status === VP_STATUS.SUBMITTED && (
          <FormAlert kind="info">
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 shrink-0" /> Submitted{row.submittedAt ? ` on ${fmtDateTime(row.submittedAt)}` : ""}{row.evaluatorName ? ` by ${row.evaluatorName}` : ""}. Waiting for the Super Admin&apos;s decision.</span>
          </FormAlert>
        )}
        {(row.status === VP_STATUS.APPROVED || row.status === VP_STATUS.PAYMENT_CONFIRMED) && (
          <FormAlert kind="success">
            <strong className="font-semibold">Approved{row.decidedBy ? ` by ${row.decidedBy}` : ""}{row.decidedAt ? ` on ${fmtDateTime(row.decidedAt)}` : ""}.</strong>{" "}
            {row.decisionComment ? `${row.decisionComment} ` : ""}
            {row.status === VP_STATUS.APPROVED ? "Waiting for the Finance Admin to confirm the payment amount." : ""}
          </FormAlert>
        )}
        {future && mode === "department" && <FormAlert kind="info">This month has not started, so it cannot be evaluated yet.</FormAlert>}

        {row.status === VP_STATUS.PAYMENT_CONFIRMED && (
          <Card>
            <CardHeader title="Payment" subtitle="Payment amount confirmed for this request" />
            <dl className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3.5">
              <Detail label="Payment amount" value={<span className="font-mono tnum font-semibold">{money(row.paymentAmount)}</span>} />
              <Detail label="Reference" value={row.paymentReference ?? "—"} />
              <Detail label="Confirmed by" value={row.paymentConfirmedBy ?? "—"} />
              <Detail label="Confirmed on" value={row.paymentConfirmedAt ? fmtDateTime(row.paymentConfirmedAt) : "—"} />
              {row.paymentNote && <div className="col-span-full"><Detail label="Note" value={<span className="whitespace-normal">{row.paymentNote}</span>} /></div>}
            </dl>
          </Card>
        )}

        <Card>
          <CardHeader title="Individual" subtitle={editable ? "Days and Tenure are counted to today" : "As recorded at submission"} />
          <dl className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3.5">
            <Detail label="ID" value={<span className="font-mono tnum">{row.empCode}</span>} />
            <Detail label="Name" value={row.name} />
            <Detail label="DOJ" value={row.doj ? fmtDate(row.doj) : "—"} />
            <Detail label="Days" value={row.days ?? "—"} />
            <Detail label="Tenure" value={row.tenure} />
            <Detail label="Designation" value={row.designation} />
            <Detail label="Department" value={row.department} />
            <Detail label="Supervisor" value={row.supervisor} />
            <Detail label="Business Unit" value={row.businessUnit} />
            <Detail label="Submitted on" value={row.submittedAt ? fmtDateTime(row.submittedAt) : "Not submitted"} />
            <Detail label="Submitted by" value={row.submittedAt ? row.evaluatorName : "—"} />
            {row.decidedAt && (
              <>
                <Detail label={row.status === VP_STATUS.RETURNED ? "Returned by" : row.status === VP_STATUS.REJECTED ? "Rejected by" : "Approved by"} value={row.decidedBy} />
                <Detail label={row.status === VP_STATUS.RETURNED ? "Returned on" : row.status === VP_STATUS.REJECTED ? "Rejected on" : "Approved on"} value={fmtDateTime(row.decidedAt)} />
              </>
            )}
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
            {!canHrNote && (
              <Field label="HR Note" hint={row.hrNoteMeta ?? "Completed by HR after submission"}>
                <Textarea aria-label="HR Note" value={row.hrNote} disabled readOnly className="min-h-[64px]" />
              </Field>
            )}
          </div>
        </Card>
      </form>

      {canHrNote && row.evaluationId && <HrNoteForm row={row} />}
      {canPay && row.evaluationId && <PaymentForm row={row} viewerId={viewerId} onDone={onClose} />}
      {row.events.length > 0 && <History row={row} />}

      {confirm && (
        <Dialog open onClose={() => setConfirm(false)} title={row.status === VP_STATUS.RETURNED ? "Resubmit this request?" : "Submit this request?"} description={`${row.name} · ${periodLabel}. The submission date and time are recorded, the request is locked and it goes to the Super Admin for approval. You can change it again only if it is returned.`}>
          <div className="rounded-xl border border-ink-100 bg-surface px-4 py-3 mb-5 flex items-baseline justify-between">
            <span className="text-[13px] text-ink-500">Total Score</span>
            <span className="font-mono tnum text-[18px] font-semibold text-ink-900">{score(totals.totalScore)} / {VP_TOTAL_MAX}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={pending}>Cancel</Button>
            <Button onClick={() => send("submit")} loading={pending} icon={<Send className="h-4 w-4" />}>Submit to Super Admin</Button>
          </div>
        </Dialog>
      )}
      {decision && row.evaluationId && <DecisionDialog row={row} decision={decision} onClose={() => setDecision(null)} onDone={onClose} />}
    </Drawer>
  );
}

/* ---------- Workflow history ---------- */

function History({ row }: { row: VpRow }) {
  return (
    <Card className="mt-5">
      <CardHeader title="History" subtitle="Every step of this request, oldest first" />
      <ol className="px-5 pb-5 space-y-3.5">
        {row.events.map((ev) => (
          <li key={ev.id} className="flex gap-3">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", ev.action === "REJECTED" || ev.action === "RETURNED" ? "bg-red-500" : ev.action === "APPROVED" || ev.action === "PAYMENT_CONFIRMED" ? "bg-emerald-600" : "bg-ink-300")} aria-hidden />
            <div className="min-w-0">
              <div className="text-[13.5px] text-ink-900"><span className="font-medium">{VP_EVENT_LABELS[ev.action] ?? ev.action}</span> <span className="text-ink-500">by {ev.actor}</span></div>
              <div className="text-[12px] text-ink-400">{fmtDateTime(ev.at)}</div>
              {ev.comment && <p className="mt-1 text-[13px] text-ink-700 whitespace-pre-wrap">{ev.comment}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ---------- Super Admin decision ---------- */

const DECISIONS: Record<Decision, { title: string; description: string; label: string; field: string; placeholder: string; required: boolean }> = {
  approve: { title: "Approve this request?", description: "The approved request and all its details go to the Finance Admin, who confirms the payment amount.", label: "Approve", field: "Comment (optional)", placeholder: "Any note for the Department Head or Finance", required: false },
  return: { title: "Return for correction", description: "The request goes back to the Department Head with your feedback. They can correct it and submit again.", label: "Return to Department Head", field: "Feedback", placeholder: "What needs to be corrected?", required: true },
  reject: { title: "Reject this request?", description: "A rejected request is closed for this month and cannot be resubmitted. The Department Head sees your reason.", label: "Reject request", field: "Reason", placeholder: "Why is this request rejected?", required: true },
};

function DecisionDialog({ row, decision, onClose, onDone }: { row: VpRow; decision: Decision; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [state, act, pending] = useActionState(decideEvaluationAction, null);
  const d = DECISIONS[decision];
  React.useEffect(() => {
    if (state?.ok) { toast("success", state.message ?? "Done."); onDone(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <Dialog open onClose={onClose} title={d.title} description={`${row.name} · ${MONTHS[row.periodMonth - 1]} ${row.periodYear} · Total Score ${score(row.totalScore)} of ${VP_TOTAL_MAX}. ${d.description}`}>
      <form action={act} className="space-y-4" noValidate>
        <input type="hidden" name="evaluationId" value={row.evaluationId ?? ""} />
        <input type="hidden" name="decision" value={decision} />
        {state?.message && !state.ok && !state.errors?.comment && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label={d.field} htmlFor="vp-decision-comment" required={d.required} error={state?.errors?.comment}>
          <Textarea id="vp-decision-comment" name="comment" defaultValue={state?.values?.comment} invalid={!!state?.errors?.comment} placeholder={d.placeholder} maxLength={2000} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant={decision === "reject" ? "danger" : "primary"} loading={pending}>{d.label}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------- HR Note ---------- */

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
        <Field label="HR Note" htmlFor="vp-hr-note" error={state?.errors?.hrNote} hint={row.hrNoteMeta ? `Last saved by ${row.hrNoteMeta}` : "Visible to the Department Head and the Finance Admin"}>
          <Textarea id="vp-hr-note" name="hrNote" value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={2000} />
        </Field>
        <div className="flex justify-end"><Button type="submit" variant="outline" loading={pending} disabled={note === row.hrNote}>Save HR note</Button></div>
      </form>
    </Card>
  );
}

/* ---------- Finance: confirm payment ---------- */

function PaymentForm({ row, viewerId, onDone }: { row: VpRow; viewerId: string; onDone: () => void }) {
  const toast = useToast();
  const [state, act, pending] = useActionState(confirmPaymentAction, null);
  const [amount, setAmount] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [note, setNote] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};
  const own = row.employeeId === viewerId;
  const value = toNum(amount);
  React.useEffect(() => {
    if (!state) return;
    setConfirm(false);
    if (state.ok) { toast("success", state.message ?? "Payment confirmed."); onDone(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <Card className="mt-5 border-brand-200">
      <CardHeader title="Confirm payment" subtitle={`Approved with a Total Score of ${score(row.totalScore)} of ${VP_TOTAL_MAX}. Enter the applicable payment amount.`} />
      <form ref={formRef} action={act} className="px-5 pb-5 space-y-4" noValidate>
        <input type="hidden" name="evaluationId" value={row.evaluationId ?? ""} />
        {state?.message && !state.ok && !Object.keys(e).length && <FormAlert kind="error">{state.message}</FormAlert>}
        {own && <FormAlert kind="info">This is your own Variable Pay, so someone else must confirm it.</FormAlert>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Payment amount (BDT)" htmlFor="vp-pay-amount" required error={e.amount}>
            <Input id="vp-pay-amount" name="amount" type="number" inputMode="decimal" min={0} step="0.01" className="font-mono text-right" value={amount} onChange={(ev) => setAmount(ev.target.value)} invalid={!!e.amount} readOnly={own} placeholder="0.00" />
          </Field>
          <Field label="Payment reference" htmlFor="vp-pay-ref" error={e.reference} hint="Voucher, payroll batch or transfer number">
            <Input id="vp-pay-ref" name="reference" value={reference} onChange={(ev) => setReference(ev.target.value)} invalid={!!e.reference} readOnly={own} maxLength={120} />
          </Field>
        </div>
        <Field label="Finance note" htmlFor="vp-pay-note" error={e.note}>
          <Textarea id="vp-pay-note" name="note" className="min-h-[64px]" value={note} onChange={(ev) => setNote(ev.target.value)} invalid={!!e.note} readOnly={own} maxLength={1000} />
        </Field>
        <div className="flex items-center justify-end gap-3">
          <span className="text-[12px] text-ink-400">A confirmed payment cannot be changed.</span>
          <Button type="button" icon={<BadgeDollarSign className="h-4 w-4" />} disabled={own || !(value !== null && value > 0)} onClick={() => setConfirm(true)}>Confirm payment</Button>
        </div>
      </form>
      {confirm && (
        <Dialog open onClose={() => setConfirm(false)} title="Confirm this payment?" description={`${row.name} · ${MONTHS[row.periodMonth - 1]} ${row.periodYear}. The amount is recorded against your name and cannot be changed afterwards.`}>
          <div className="rounded-xl border border-ink-100 bg-surface px-4 py-3 mb-5 flex items-baseline justify-between">
            <span className="text-[13px] text-ink-500">Payment amount</span>
            <span className="font-mono tnum text-[18px] font-semibold text-ink-900">{money(value)}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={pending}>Cancel</Button>
            <Button onClick={() => formRef.current?.requestSubmit()} loading={pending}>Confirm payment</Button>
          </div>
        </Dialog>
      )}
    </Card>
  );
}

/* ---------- Eligibility roster ---------- */

function RosterDialog({ roster, onClose }: { roster: VpRosterRow[]; onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [empId, setEmpId] = React.useState("");
  const nameQ = name.trim().toLowerCase();
  const idQ = empId.trim().toLowerCase();
  const matches = (r: VpRosterRow) => r.name.toLowerCase().includes(nameQ) && r.empCode.toLowerCase().includes(idQ);
  const shown = roster.filter(matches).length;
  return (
    <Dialog open onClose={onClose} width="max-w-3xl" title="Eligible employees" description="Choose which employees in your department are eligible for Variable Pay. DOJ and Supervisor appear on every evaluation.">
      {roster.length === 0 ? (
        <p className="text-[13px] text-ink-500">There are no employees in your department yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <Input type="search" aria-label="Search by Employee Name" placeholder="Search by Employee Name" className="pl-9" value={name} onChange={(ev) => setName(ev.target.value)} />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <Input type="search" aria-label="Search by Employee ID" placeholder="Search by Employee ID" className="pl-9 font-mono placeholder:font-sans" value={empId} onChange={(ev) => setEmpId(ev.target.value)} />
            </div>
          </div>
          <p className="text-[12px] text-ink-400 mb-1" aria-live="polite">{nameQ || idQ ? `${shown} of ${roster.length} employees` : `${roster.length} employee${roster.length === 1 ? "" : "s"}`}</p>
          {/* Rows that do not match are hidden, not unmounted, so unsaved changes survive a search. */}
          <ul className="divide-y divide-ink-100">
            {roster.map((r) => <RosterRow key={r.id} row={r} hidden={!matches(r)} />)}
          </ul>
          {shown === 0 && <p className="py-6 text-center text-[13px] text-ink-500">No employee matches this name and Employee ID.</p>}
        </>
      )}
      <div className="flex justify-end mt-5"><Button variant="outline" onClick={onClose}>Done</Button></div>
    </Dialog>
  );
}

function RosterRow({ row, hidden }: { row: VpRosterRow; hidden: boolean }) {
  const toast = useToast();
  const [state, act, pending] = useActionState(setEligibilityAction, null);
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
    <li className="py-3.5" hidden={hidden}>
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
