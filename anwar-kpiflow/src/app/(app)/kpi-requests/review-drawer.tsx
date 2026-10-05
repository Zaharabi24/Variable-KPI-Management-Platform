"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Check, SlidersHorizontal, Trash2, Undo2, XCircle } from "lucide-react";
import { auditDecideAction, deleteKpiAction, deptDecideAction, financeDecideAction, hrDecideAction } from "@/actions/review";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, Dialog } from "@/components/ui/modal";
import { Field, Textarea, FormAlert } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { fmtNum } from "@/lib/calc";
import { DEPT_CRITERIA, KPI_TOTAL_MAX, STAGE_LABELS, STATUS_HINTS, kpiTitle, stageOf, type KpiStage } from "@/lib/kpi";
import type { QueueRow } from "@/lib/kpi-data";
import { BreakdownCard, KpiHistory, KpiSheetReadonly, ScoreStrip, SheetMeta, StatusRouteCard, ownerLabelOf, periodLabelOf, useKpiSheet } from "@/components/kpi/kpi-sheet";

type ReviewStage = Exclude<KpiStage, "EMPLOYEE">;
const ACTIONS = { DEPT: deptDecideAction, HR: hrDecideAction, FINANCE: financeDecideAction, AUDIT: auditDecideAction } as const;

type Ask = { decision: string; title: string; description: string; label: string; field?: string; placeholder?: string; danger?: boolean };

/**
 * A KPI request opened from the queue. Everyone sees the full form; the part that can be typed in is the part
 * that belongs to the stage the KPI is waiting at, and only for someone allowed to decide it.
 */
export function ReviewDrawer({ row, canDelete, onClose }: { row: QueueRow; canDelete: boolean; onClose: () => void }) {
  const stage = row.actionable ? (stageOf(row.status) as ReviewStage | null) : null;
  return stage ? <StageReview key={`${row.id}-${row.status}`} row={row} stage={stage} canDelete={canDelete} onClose={onClose} /> : <ReadOnly row={row} canDelete={canDelete} onClose={onClose} />;
}

function title(row: QueueRow) {
  return <span className="inline-flex flex-wrap items-center gap-2.5">{row.owner.fullName} <StatusBadge status={row.status} /></span>;
}
const subtitle = (row: QueueRow) => `KPI · ${kpiTitle(row)}${row.owner.department ? ` · ${row.owner.department}` : ""} · ${STATUS_HINTS[row.status]}`;

function ReadOnly({ row, canDelete, onClose }: { row: QueueRow; canDelete: boolean; onClose: () => void }) {
  const [deleting, setDeleting] = React.useState(false);
  return (
    <Drawer open onClose={onClose} title={title(row)} subtitle={subtitle(row)} width="max-w-4xl"
      footer={canDelete ? <div className="flex justify-end"><Button variant="ghost" size="sm" className="text-ink-500 hover:text-red-700" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(true)}>Delete KPI</Button></div> : undefined}
    >
      {row.returnRemarks && <div className="mb-5"><FormAlert kind="error"><span className="font-semibold">Returned with remarks:</span> {row.returnRemarks}</FormAlert></div>}
      <KpiSheetReadonly kpi={row} />
      {deleting && <DeleteDialog row={row} onClose={() => setDeleting(false)} onDone={onClose} />}
    </Drawer>
  );
}

function StageReview({ row, stage, canDelete, onClose }: { row: QueueRow; stage: ReviewStage; canDelete: boolean; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [state, act, pending] = useActionState(ACTIONS[stage], null);
  const sheet = useKpiSheet(row, state?.values);
  const [ask, setAsk] = React.useState<Ask | null>(null);
  const [reason, setReason] = React.useState(row.adjusted && row.adjustReason ? row.adjustReason : "");
  const [note, setNote] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const decisionRef = React.useRef<HTMLInputElement>(null);
  const topRef = React.useRef<HTMLDivElement>(null);
  const e = state?.errors ?? {};
  const name = row.owner.fullName;

  React.useEffect(() => {
    if (!state) return;
    setAsk(null);
    if (state.ok) {
      toast("success", state.message ?? "Saved.");
      onClose();
      router.refresh();
    } else {
      // Make a failed decision impossible to miss: toast it and bring the message into view.
      toast("error", state.message ?? "Nothing was saved. Please check the form.");
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const send = (decision: string) => {
    if (decisionRef.current) decisionRef.current.value = decision;
    formRef.current?.requestSubmit();
  };

  const deptReady = sheet.tasksComplete && DEPT_CRITERIA.every((c) => sheet.crit[c.key].trim() !== "");
  const hrReady = sheet.crit.attendance.trim() !== "" && sheet.hr.paymentAmount.trim() !== "";
  const totalText = sheet.total === null ? "—" : `${fmtNum(sheet.total)} / ${KPI_TOTAL_MAX}`;

  const ASKS: Record<string, Ask> = {
    "DEPT:approve": { decision: "approve", title: "Approve this KPI?", label: "Approve", description: `${name} · ${kpiTitle(row)}. KPI (5) is ${sheet.kpiScore ?? "—"} of 50. The KPI goes to the HR Admin, and you will not be able to change it unless it is returned to you.` },
    "DEPT:adjust": { decision: "adjust", title: "Apply adjustment", label: "Apply Adjustment", field: "Reason for the adjustment", placeholder: "Why the employee's score breakdown was changed", description: `You changed the score breakdown ${name} submitted. KPI (5) becomes ${sheet.kpiScore ?? "—"} of 50. The reason is recorded and shown to the employee, and the KPI goes to the HR Admin.` },
    "DEPT:return": { decision: "return", title: "Return to employee", label: "Return to Employee", field: "Remarks", placeholder: "What needs to be corrected?", description: `The KPI goes back to ${name} with your remarks. They can correct it and submit again.` },
    "DEPT:reject": { decision: "reject", title: "Reject this KPI?", label: "Reject", field: "Reason", placeholder: "Why is this KPI rejected?", danger: true, description: `A rejected KPI is closed and counts in no score. ${name} sees your reason.` },
    "HR:approve": { decision: "approve", title: "Approve this KPI?", label: "Approve", description: `${name} · ${kpiTitle(row)}. Total Score ${totalText}. The KPI goes directly to the Finance Admin.` },
    "HR:return": { decision: "return", title: "Return to Department Head", label: "Return to Department Head", field: "Remarks", placeholder: "What should the Department Head review?", description: `The KPI of ${name} goes back to the Department Head with your remarks.` },
    "FINANCE:approve": { decision: "approve", title: "Approve this KPI?", label: "Approve", description: `${name} · ${kpiTitle(row)}. The KPI goes directly to the Audit Admin.` },
    "FINANCE:return": { decision: "return", title: "Reject and return to HR Admin", label: "Reject and return", field: "Remarks", placeholder: "Why is this KPI returned to the HR Admin?", danger: true, description: `The KPI of ${name} goes back to the HR Admin with your remarks.` },
    "AUDIT:approve": { decision: "approve", title: "Approve this KPI?", label: "Approve", description: `${name} · ${kpiTitle(row)}. This is the final approval: the KPI is completed and can no longer be changed.` },
    "AUDIT:return": { decision: "return", title: "Return to Finance Admin", label: "Return to Finance Admin", field: "Remarks", placeholder: "What should the Finance Admin review?", description: `The KPI of ${name} goes back to the Finance Admin with your remarks.` },
  };
  const open = (key: string) => setAsk(ASKS[`${stage}:${key}`]);
  const returnLabel = { DEPT: "Return to Employee", HR: "Return to Department Head", FINANCE: "Reject and return to HR Admin", AUDIT: "Return to Finance Admin" }[stage];

  return (
    <Drawer
      open
      onClose={onClose}
      title={title(row)}
      subtitle={subtitle(row)}
      width="max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {stage === "DEPT" ? (
            <>
              <Button icon={<Check className="h-4 w-4" />} disabled={pending || !deptReady || sheet.changed} title={sheet.changed ? "You changed the breakdown. Use Apply Adjustment." : undefined} onClick={() => open("approve")}>Approve</Button>
              <Button variant="outline" icon={<SlidersHorizontal className="h-4 w-4" />} disabled={pending || !deptReady || !sheet.changed} title={!sheet.changed ? "Change a task or score in the breakdown first." : undefined} onClick={() => open("adjust")}>Apply Adjustment</Button>
            </>
          ) : (
            <Button icon={<Check className="h-4 w-4" />} disabled={pending || (stage === "HR" && !hrReady)} onClick={() => open("approve")}>Approve</Button>
          )}
          <Button variant="outline" icon={<Undo2 className="h-4 w-4" />} disabled={pending} onClick={() => open("return")}>{returnLabel}</Button>
          {stage === "DEPT" && <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" icon={<XCircle className="h-4 w-4" />} disabled={pending} onClick={() => open("reject")}>Reject</Button>}
          {canDelete && <Button variant="ghost" size="sm" className="ml-auto text-ink-500 hover:text-red-700" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(true)}>Delete</Button>}
        </div>
      }
    >
      <div ref={topRef} />
      <form ref={formRef} action={act} className="space-y-5" noValidate onKeyDown={(ev) => { if (ev.key === "Enter" && ev.target instanceof HTMLInputElement) ev.preventDefault(); }}>
        <input type="hidden" name="kpiId" value={row.id} />
        <input ref={decisionRef} type="hidden" name="decision" defaultValue="approve" />
        <input type="hidden" name="reason" value={reason} />

        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        {row.returnRemarks && <FormAlert kind="error"><span className="font-semibold">Returned to the {STAGE_LABELS[stage]} with remarks:</span> {row.returnRemarks}</FormAlert>}
        <FormAlert kind="info">
          {stage === "DEPT" && "You can adjust the employee's score breakdown. Fill Quality of work, Time Line of Deliverables and Stakeholder & Peer Review; KPI (5) is the total of the breakdown."}
          {stage === "HR" && "Fill Attendance, Remarks, HR Note and the Payment Amount. The Total Score is calculated automatically."}
          {stage === "FINANCE" && "Review the KPI and the Payment Amount. Approve to send it to the Audit Admin, or reject and return it to the HR Admin with remarks."}
          {stage === "AUDIT" && "Final verification. Approve to complete the KPI, or return it to the Finance Admin with remarks."}
        </FormAlert>

        <StatusRouteCard kpi={row} />
        <SheetMeta kpi={row} />
        <BreakdownCard sheet={sheet} ownerLabel={ownerLabelOf(row)} editable={stage === "DEPT"} errors={e} baseline={row.tasks.map((t) => t.employeeScore)} />
        {stage !== "DEPT" && row.adjusted && row.adjustReason && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900"><span className="font-semibold">Adjusted by the Department Head.</span> {row.adjustReason}</div>
        )}
        <ScoreStrip
          sheet={sheet}
          periodLabel={periodLabelOf(row)}
          edit={{ dept: stage === "DEPT", hr: stage === "HR" }}
          visible={{ dept: true, hr: stage !== "DEPT" || row.showHr }}
          errors={e}
          payment={row.showPayment ? { editable: stage === "HR" } : undefined}
        />

        {(stage === "FINANCE" || stage === "AUDIT") && (
          <Card>
            <div className="p-5">
              <Field label={stage === "FINANCE" ? "Finance note" : "Audit note"} htmlFor="kpi-note" error={e.note} hint="Optional. Kept with the approval and visible to HR, Finance and Audit.">
                <Textarea id="kpi-note" name="note" className="min-h-[72px]" value={note} onChange={(ev) => setNote(ev.target.value)} invalid={!!e.note} maxLength={2000} />
              </Field>
              {stage === "AUDIT" && row.financeNote && <p className="mt-3 text-[13px] text-ink-700"><span className="text-ink-500">Finance Admin note:</span> {row.financeNote}</p>}
            </div>
          </Card>
        )}
      </form>
      <div className="mt-5"><KpiHistory kpi={row} /></div>

      {ask && (
        <Dialog open onClose={() => setAsk(null)} title={ask.title} description={ask.description}>
          <div className="space-y-4">
            {ask.field && (
              <Field label={ask.field} htmlFor="kpi-reason" required error={e.reason}>
                <Textarea id="kpi-reason" value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder={ask.placeholder} maxLength={2000} autoFocus />
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAsk(null)} disabled={pending}>Cancel</Button>
              <Button variant={ask.danger ? "danger" : "primary"} loading={pending} disabled={!!ask.field && reason.trim().length < 5} onClick={() => send(ask.decision)}>{ask.label}</Button>
            </div>
          </div>
        </Dialog>
      )}
      {deleting && <DeleteDialog row={row} onClose={() => setDeleting(false)} onDone={onClose} />}
    </Drawer>
  );
}

function DeleteDialog({ row, onClose, onDone }: { row: QueueRow; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [state, act, pending] = useActionState(deleteKpiAction, null);
  React.useEffect(() => {
    if (state?.ok) { toast("success", state.message ?? "Deleted."); onDone(); router.refresh(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <Dialog open onClose={onClose} title="Delete this KPI?" description={`${row.owner.fullName} · ${kpiTitle(row)}. The KPI is removed from every list and score. It stays in the version history with your reason.`}>
      <form action={act} className="space-y-4" noValidate>
        <input type="hidden" name="kpiId" value={row.id} />
        {state?.message && !state.ok && !state.errors?.reason && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label="Reason" htmlFor="kpi-delete-reason" required error={state?.errors?.reason}>
          <Textarea id="kpi-delete-reason" name="reason" defaultValue={state?.values?.reason} placeholder="Why is this KPI deleted?" maxLength={2000} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={pending}>Delete KPI</Button>
        </div>
      </form>
    </Dialog>
  );
}
