"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ExternalLink, FileText, Pencil, Trash2 } from "lucide-react";
import { Drawer, Dialog } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, FormAlert } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { approveKpiAction, adjustKpiAction, returnKpiAction, rejectKpiAction, editKpiRequestAction, deleteKpiRequestAction } from "@/actions/review";
import type { ActionState } from "@/actions/auth";
import { achievementPct, fmtNum, fmtPct, formulaText } from "@/lib/calc";
import { CATEGORY_LABELS, MONTHS, type KpiCategory } from "@/lib/constants";
import { FIELD_LABELS } from "@/lib/versions";
import { fmtBytes, fmtDateTime } from "@/lib/utils";
import type { RequestItem } from "./request-queue";

type Mode = null | "adjust" | "return" | "reject" | "edit" | "delete";

/** Section 15.7 — review drawer: target/actual, evidence, remarks, calculation path, decision panel, record actions. */
export function ReviewDrawer({ item, onClose }: { item: RequestItem; onClose: () => void }) {
  const [mode, setMode] = React.useState<Mode>(null);
  const toast = useToast();
  const [approveState, approve, approving] = useActionState(approveKpiAction, null);

  React.useEffect(() => {
    if (approveState?.ok) { toast("success", approveState.message ?? "Approved."); onClose(); }
    else if (approveState?.message) toast("error", approveState.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveState]);

  const done = (s: ActionState) => {
    if (s?.ok) { toast("success", s.message ?? "Done."); setMode(null); onClose(); }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={item.name}
      subtitle={`${item.owner.fullName} · ${item.owner.employeeId} · ${item.owner.designation ?? "Employee"}`}
      width="max-w-3xl"
      footer={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <form action={approve}>
              <input type="hidden" name="kpiId" value={item.id} />
              <Button type="submit" loading={approving}>Approve calculated</Button>
            </form>
            <Button variant="secondary" onClick={() => setMode("adjust")}>Apply adjustment</Button>
            <Button variant="outline" onClick={() => setMode("return")}>Return to employee</Button>
            <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" onClick={() => setMode("reject")}>Reject</Button>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setMode("edit")}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => setMode("delete")}>Delete</Button>
            </div>
          </div>
          <p className="text-[12px] text-ink-400">Adjustment, Return, Reject and Delete require a written reason. Every decision is appended to version history and the audit trail.</p>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold">{item.name}</h3>
              <p className="text-[12.5px] text-ink-500 mt-0.5">
                {CATEGORY_LABELS[item.category as KpiCategory]} · {MONTHS[item.periodMonth - 1]} {item.periodYear} · submitted {fmtDateTime(item.submittedAt)} · v{item.currentVersion}
              </p>
            </div>
            <Link href={`/my-kpi/${item.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-700 hover:underline whitespace-nowrap">
              Open full record <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Tile label="Target" value={`${fmtNum(item.target)} ${item.unit}`} />
            <Tile label="Actual" value={`${fmtNum(item.actual)} ${item.unit}`} />
            <Tile label="Evidence" value={`${item.evidence.length} file(s)`} />
          </div>
          {item.remarks && <blockquote className="mt-4 border-l-4 border-brand-200 bg-surface rounded-r-lg px-4 py-2.5 text-[13.5px] text-ink-700 italic">“{item.remarks}”</blockquote>}
          <ul className="mt-3 space-y-2">
            {item.evidence.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-brand-700 shrink-0" />
                  <div className="min-w-0"><div className="text-[13px] font-medium truncate">{f.fileName}</div><div className="font-mono text-[10.5px] text-ink-400 truncate">sha256:{f.sha256}</div></div>
                </div>
                <a href={`/api/evidence/${f.id}`} className="text-[12.5px] font-medium text-brand-700 hover:underline shrink-0">Download · {fmtBytes(f.size)}</a>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h3 className="text-[15px] font-semibold mb-2">Calculation path</h3>
          <dl className="divide-y divide-ink-100">
            <Row label="Formula"><span className="font-mono text-[12.5px]">{formulaText(item.target, item.actual)}</span></Row>
            <Row label="Achievement"><span className="font-mono tnum">{fmtPct(item.achievement)}</span></Row>
            <Row label="Calculated score"><span className="font-mono tnum">{fmtNum(item.calculatedScore)}</span></Row>
            <Row label="Final score"><StatusBadge status="SUBMITTED" label="Pending approval" /></Row>
            <Row label="KPI weight"><span className="font-mono tnum">{fmtNum(item.weight)}%</span></Row>
          </dl>
        </section>

        {item.versions.length > 1 && (
          <section className="card p-5">
            <h3 className="text-[15px] font-semibold mb-3">History</h3>
            <ol className="space-y-3 text-[13px]">
              {[...item.versions].reverse().map((v) => {
                const changes = safeChanges(v.changes);
                return (
                  <li key={v.id} className="border-l-2 border-ink-100 pl-3">
                    <div className="flex justify-between gap-3"><span className="font-medium">v{v.versionNo} · {v.action.charAt(0) + v.action.slice(1).toLowerCase()} · {v.changedBy.fullName}</span><span className="text-ink-400 tnum">{fmtDateTime(v.createdAt)}</span></div>
                    {v.reason && <div className="text-ink-600 mt-0.5">Reason: {v.reason}</div>}
                    {changes.length > 0 && <div className="text-ink-500 mt-0.5">{changes.map((c) => `${FIELD_LABELS[c.field] ?? c.field}: ${c.oldValue ?? "—"} → ${c.newValue ?? "—"}`).join(" · ")}</div>}
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>

      {mode === "adjust" && <AdjustDialog item={item} onClose={() => setMode(null)} onDone={done} />}
      {mode === "return" && <ReasonDialog kpiId={item.id} action={returnKpiAction} title="Return to employee" description="The KPI goes back to the employee with your remarks for correction and resubmission." label="Remarks for the employee" submit="Return KPI" onClose={() => setMode(null)} onDone={done} />}
      {mode === "reject" && <ReasonDialog kpiId={item.id} action={rejectKpiAction} title="Reject KPI" description="The KPI is closed as Rejected and excluded from all scoring." label="Reason for rejection" submit="Reject KPI" danger onClose={() => setMode(null)} onDone={done} />}
      {mode === "delete" && <ReasonDialog kpiId={item.id} action={deleteKpiRequestAction} title="Delete request" description="The request disappears from normal screens but stays in version history with your reason." label="Reason for deletion" submit="Delete request" danger onClose={() => setMode(null)} onDone={done} />}
      {mode === "edit" && <EditDialog item={item} onClose={() => setMode(null)} onDone={done} />}
    </Drawer>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface border border-ink-100 p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">{label}</div>
      <div className="font-mono tnum text-[15px] text-ink-900 mt-1 truncate" title={value}>{value}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="text-[14px] text-right">{children}</dd>
    </div>
  );
}
function safeChanges(s: string): { field: string; oldValue: string | number | null; newValue: string | number | null }[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

function ReasonDialog({
  kpiId, action, title, description, label, submit, danger, onClose, onDone,
}: {
  kpiId: string; action: (s: ActionState, f: FormData) => Promise<ActionState>; title: string; description: string; label: string; submit: string; danger?: boolean; onClose: () => void; onDone: (s: ActionState) => void;
}) {
  const [state, act, pending] = useActionState(action, null);
  React.useEffect(() => { if (state) onDone(state); }, [state, onDone]);
  return (
    <Dialog open onClose={onClose} title={title} description={description}>
      <form action={act} className="space-y-4" noValidate>
        <input type="hidden" name="kpiId" value={kpiId} />
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label={label} htmlFor="reason" required error={state?.errors?.reason}>
          <Textarea id="reason" name="reason" defaultValue={state?.values?.reason} autoFocus placeholder="Write a clear reason the employee will see." invalid={!!state?.errors?.reason} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant={danger ? "danger" : "primary"} loading={pending}>{submit}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function AdjustDialog({ item, onClose, onDone }: { item: RequestItem; onClose: () => void; onDone: (s: ActionState) => void }) {
  const [state, act, pending] = useActionState(adjustKpiAction, null);
  const [target, setTarget] = React.useState(String(item.target));
  const [actual, setActual] = React.useState(String(item.actual));
  const [weight, setWeight] = React.useState(String(item.weight));
  const [finalScore, setFinalScore] = React.useState(String(item.calculatedScore));
  React.useEffect(() => { if (state) onDone(state); }, [state, onDone]);
  const recalculated = achievementPct(Number(target) || 0, Number(actual) || 0);
  const e = state?.errors ?? {};
  return (
    <Dialog open onClose={onClose} title="Apply adjustment" description="Change the Score, KPI Weight or another value, give a reason, and approve the adjusted result. The employee sees the change and its history." width="max-w-lg">
      <form action={act} className="space-y-4" noValidate>
        <input type="hidden" name="kpiId" value={item.id} />
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target" htmlFor="adj-target" error={e.target}><Input id="adj-target" name="target" type="number" step="any" className="font-mono" value={target} onChange={(ev) => setTarget(ev.target.value)} /></Field>
          <Field label="Actual" htmlFor="adj-actual" error={e.actual}><Input id="adj-actual" name="actual" type="number" step="any" className="font-mono" value={actual} onChange={(ev) => setActual(ev.target.value)} /></Field>
          <Field label="KPI Weight (%)" htmlFor="adj-weight" required error={e.weight}><Input id="adj-weight" name="weight" type="number" step="any" className="font-mono" value={weight} onChange={(ev) => setWeight(ev.target.value)} /></Field>
          <Field label="Final Score" htmlFor="adj-score" required error={e.finalScore} hint={`Recalculated: ${fmtNum(recalculated)}`}>
            <div className="flex gap-1.5">
              <Input id="adj-score" name="finalScore" type="number" step="any" className="font-mono" value={finalScore} onChange={(ev) => setFinalScore(ev.target.value)} />
              <Button type="button" variant="subtle" size="md" onClick={() => setFinalScore(String(recalculated))} title="Use recalculated score">Use</Button>
            </div>
          </Field>
        </div>
        <Field label="Reason for adjustment" htmlFor="adj-reason" required error={e.reason}>
          <Textarea id="adj-reason" name="reason" defaultValue={state?.values?.reason} placeholder="e.g. Evidence supports 580,000 not 610,000; score corrected accordingly." invalid={!!e.reason} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>Apply adjustment and approve</Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditDialog({ item, onClose, onDone }: { item: RequestItem; onClose: () => void; onDone: (s: ActionState) => void }) {
  const [state, act, pending] = useActionState(editKpiRequestAction, null);
  React.useEffect(() => { if (state) onDone(state); }, [state, onDone]);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};
  return (
    <Dialog open onClose={onClose} title="Edit request" description="Correct the request before deciding. The change is saved as a new version with your reason; the request stays pending." width="max-w-lg">
      <form action={act} className="space-y-4" noValidate>
        <input type="hidden" name="kpiId" value={item.id} />
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label="KPI" htmlFor="ed-name" required error={e.name}><Input id="ed-name" name="name" defaultValue={v.name ?? item.name} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Target" htmlFor="ed-target" required error={e.target}><Input id="ed-target" name="target" type="number" step="any" className="font-mono" defaultValue={v.target ?? item.target} /></Field>
          <Field label="Actual" htmlFor="ed-actual" required error={e.actual}><Input id="ed-actual" name="actual" type="number" step="any" className="font-mono" defaultValue={v.actual ?? item.actual} /></Field>
          <Field label="Weight (%)" htmlFor="ed-weight" required error={e.weight}><Input id="ed-weight" name="weight" type="number" step="any" className="font-mono" defaultValue={v.weight ?? item.weight} /></Field>
        </div>
        <Field label="Remarks" htmlFor="ed-remarks" error={e.remarks}><Textarea id="ed-remarks" name="remarks" defaultValue={v.remarks ?? item.remarks} /></Field>
        <Field label="Reason for the edit" htmlFor="ed-reason" required error={e.reason}><Textarea id="ed-reason" name="reason" defaultValue={v.reason} placeholder="Why the request was corrected." className="min-h-[64px]" /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>Update request</Button>
        </div>
      </form>
    </Dialog>
  );
}
